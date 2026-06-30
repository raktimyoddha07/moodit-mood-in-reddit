import logging
from sqlalchemy import select
from app.database import SessionLocal
from app.models import SearchRequest, RedditPost, PostSentimentResult, ExtractedEntity, LlmExplanation
from app.analysis import fetch_reddit_posts, preprocess_text, analyze_sentiment, extract_entities, generate_llm_explanation

logger = logging.getLogger("app.pipeline")
logging.basicConfig(level=logging.INFO)

async def run_analysis_pipeline(search_id: int):
    """
    Background pipeline that executes the search, deduplicates posts,
    runs sentiment analysis, extracts entities, and uses Gemini
    for explanation of extreme positive/negative posts.
    """
    async with SessionLocal() as db:
        # 1. Fetch SearchRequest
        result = await db.execute(select(SearchRequest).where(SearchRequest.id == search_id))
        search_req = result.scalar_one_or_none()
        if not search_req:
            logger.error(f"Search request {search_id} not found in database.")
            return
            
        try:
            # 2. Update status to running
            search_req.status = "running"
            await db.commit()
            
            # 3. Fetch Reddit Posts
            logger.info(f"Fetching posts for search_id {search_id} (keyword: {search_req.keyword})")
            posts = fetch_reddit_posts(
                query=search_req.keyword,
                limit=search_req.post_count,
                subreddit_name=search_req.subreddit,
                time_window=search_req.time_window
            )
            
            if not posts:
                search_req.status = "completed"
                await db.commit()
                logger.info(f"No posts found for search_id {search_id}")
                return
                
            # Deduplicate and find/create RedditPost entries
            reddit_ids = [p["reddit_id"] for p in posts]
            existing_posts_result = await db.execute(
                select(RedditPost).where(RedditPost.reddit_id.in_(reddit_ids))
            )
            existing_posts_map = {p.reddit_id: p for p in existing_posts_result.scalars().all()}
            
            sentiment_input_data = []  # stores (db_post, raw_text, clean_text)
            seen_batch = set()
            
            for post_data in posts:
                r_id = post_data["reddit_id"]
                if r_id in seen_batch:
                    continue
                seen_batch.add(r_id)
                
                db_post = existing_posts_map.get(r_id)
                if not db_post:
                    # Create new RedditPost
                    db_post = RedditPost(
                        reddit_id=r_id,
                        title=post_data["title"],
                        selftext=post_data["selftext"],
                        text=post_data["text"],
                        created_utc=post_data["created_utc"]
                    )
                    db.add(db_post)
                    # Flush to get the generated DB primary key id
                    await db.flush()
                
                clean_text = preprocess_text(db_post.text)
                sentiment_input_data.append((db_post, db_post.text, clean_text))
            
            # Commit newly added RedditPosts
            await db.commit()
            
            # 4. Perform sentiment analysis & entity extraction
            results_to_save = []
            
            for db_post, raw_text, clean_text in sentiment_input_data:
                # Sentiment Analysis
                sent_res = analyze_sentiment(
                    clean_text=clean_text,
                    w_vader=search_req.w_vader,
                    w_blob=search_req.w_blob,
                    w_bert=search_req.w_bert
                )
                
                db_sent = PostSentimentResult(
                    search_id=search_id,
                    post_id=db_post.id,
                    vader_score=sent_res["vader_score"],
                    blob_score=sent_res["blob_score"],
                    bert_score=sent_res["bert_score"],
                    bert_confidence=sent_res["bert_confidence"],
                    ensemble_score=sent_res["ensemble_score"],
                    label=sent_res["label"]
                )
                db.add(db_sent)
                results_to_save.append((db_sent, db_post))
                
                # Entity Extraction
                entities = extract_entities(
                    clean_text=clean_text,
                    allowed_labels=search_req.entity_filters
                )
                for ent in entities:
                    db_ent = ExtractedEntity(
                        search_id=search_id,
                        post_id=db_post.id,
                        text=ent["text"],
                        label=ent["label"]
                    )
                    db.add(db_ent)
            
            await db.flush()
            
            # 5. LLM explanations for extreme positive/negative posts
            positives = [res for res in results_to_save if res[0].ensemble_score > 0.1]
            negatives = [res for res in results_to_save if res[0].ensemble_score < -0.1]
            
            # Sort descending for positive, ascending for negative
            top_positives = sorted(positives, key=lambda x: x[0].ensemble_score, reverse=True)[:3]
            top_negatives = sorted(negatives, key=lambda x: x[0].ensemble_score)[:3]
            
            subset_to_explain = top_positives + top_negatives
            
            for db_sent, db_post in subset_to_explain:
                explanation_text = generate_llm_explanation(db_post.text, db_sent.label)
                db_explanation = LlmExplanation(
                    search_id=search_id,
                    post_id=db_post.id,
                    explanation=explanation_text
                )
                db.add(db_explanation)
            
            # Complete search
            search_req.status = "completed"
            await db.commit()
            logger.info(f"Pipeline completed successfully for search_id {search_id}")
            
        except Exception as e:
            await db.rollback()
            # Refetch search_req in case session was rolled back
            try:
                # We need to create a new transaction or session since db was rolled back
                async with SessionLocal() as db_err:
                    res_err = await db_err.execute(select(SearchRequest).where(SearchRequest.id == search_id))
                    req_err = res_err.scalar_one_or_none()
                    if req_err:
                        req_err.status = "failed"
                        req_err.error_message = str(e)
                        await db_err.commit()
            except Exception as db_err_exc:
                logger.error(f"Failed to save error status to database: {db_err_exc}")
            logger.exception(f"Pipeline failed for search_id {search_id} with error: {e}")
