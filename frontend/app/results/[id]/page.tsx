"use client";

import { useEffect, useState, useCallback } from "react";
import { getSearchResults, SearchResults, Post } from "@/lib/api";
import DonutChart   from "@/components/charts/DonutChart";
import TimelineChart from "@/components/charts/TimelineChart";
import PostCard      from "@/components/PostCard";

/* ── Sentiment palette ── */
const DONUT_SLICES = (s: SearchResults["summary"]) =>
  s
    ? [
        { label: "Positive", value: s.positive_count, color: "#10b981" },
        { label: "Neutral",  value: s.neutral_count,  color: "#64748b" },
        { label: "Negative", value: s.negative_count, color: "#ef4444" },
      ]
    : [];

/* ── Metric Card ── */
function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="card" style={{ padding: "22px 24px", flex: 1, minWidth: 150 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{sub}</p>
    </div>
  );
}

/* ── Skeleton placeholder ── */
function Skeleton({ h = 180 }: { h?: number }) {
  return (
    <div style={{
      height: h, borderRadius: 16,
      background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

/* ── Sort options ── */
const SORT_OPTIONS = [
  { value: "score_desc",  label: "Highest Score First"  },
  { value: "score_asc",   label: "Lowest Score First"   },
  { value: "newest",      label: "Newest First"          },
  { value: "oldest",      label: "Oldest First"          },
];
type SortKey = "score_desc" | "score_asc" | "newest" | "oldest";
type FilterKey = "All" | "Positive" | "Neutral" | "Negative";

const sortPosts = (posts: Post[], sort: SortKey): Post[] => {
  const arr = [...posts];
  if (sort === "score_desc") return arr.sort((a, b) => b.sentiment.ensemble_score - a.sentiment.ensemble_score);
  if (sort === "score_asc")  return arr.sort((a, b) => a.sentiment.ensemble_score - b.sentiment.ensemble_score);
  if (sort === "newest")     return arr.sort((a, b) => new Date(b.created_utc).getTime() - new Date(a.created_utc).getTime());
  if (sort === "oldest")     return arr.sort((a, b) => new Date(a.created_utc).getTime() - new Date(b.created_utc).getTime());
  return arr;
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [data,    setData]    = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [sort,    setSort]    = useState<SortKey>("score_desc");
  const [filter,  setFilter]  = useState<FilterKey>("All");

  const fetchData = useCallback(async () => {
    try {
      const res = await getSearchResults(Number(params.id));
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Derived lists */
  const allPosts = data?.posts ?? [];
  const filtered = filter === "All" ? allPosts : allPosts.filter((p) => p.sentiment.label === filter);
  const sorted   = sortPosts(filtered, sort);
  const summary  = data?.summary;
  const req      = data?.search_request;

  const avgScore = allPosts.length
    ? (allPosts.reduce((a, p) => a + p.sentiment.ensemble_score, 0) / allPosts.length).toFixed(3)
    : "—";

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
      `}</style>

      <div className="page-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* ── Sticky Header ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          background: "rgba(8,8,18,0.75)",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <span style={{ fontSize: 20 }}>🌡️</span>
              <span style={{ fontSize: 17, fontWeight: 800, background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moodit</span>
            </a>

            {req && (
              <>
                <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 18 }}>/</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {req.keyword}
                </span>
                <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}>
                  {req.time_window}
                </span>
                {req.subreddit && (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>r/{req.subreddit}</span>
                )}
              </>
            )}

            <a
              href="/"
              style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}
            >
              ← New Search
            </a>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "40px 24px 80px" }}>

          {/* Loading */}
          {loading && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <Skeleton h={100} /><Skeleton h={100} /><Skeleton h={100} /><Skeleton h={100} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
                <Skeleton h={300} /><Skeleton h={300} />
              </div>
              <Skeleton h={120} /><Skeleton h={120} /><Skeleton h={120} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="fade-up card" style={{ padding: "32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <p style={{ fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Failed to load results</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{error}</p>
            </div>
          )}

          {/* No posts */}
          {!loading && !error && allPosts.length === 0 && (
            <div className="fade-up card" style={{ padding: "48px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p style={{ fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>No posts found</p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
                Try a different keyword, subreddit, or wider time window.
              </p>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", textDecoration: "none", fontSize: 14 }}>
                ← Try another search
              </a>
            </div>
          )}

          {!loading && !error && allPosts.length > 0 && summary && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* ── Row 1: Metric Cards ── */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MetricCard label="Posts Analysed" value={summary.total_posts} sub="total fetched & scored" color="rgba(255,255,255,0.85)" />
                <MetricCard label="Positive"  value={`${Math.round(summary.positive_percentage  * 100)}%`} sub={`${summary.positive_count} posts`}  color="#34d399" />
                <MetricCard label="Neutral"   value={`${Math.round(summary.neutral_percentage   * 100)}%`} sub={`${summary.neutral_count} posts`}   color="#94a3b8" />
                <MetricCard label="Negative"  value={`${Math.round(summary.negative_percentage  * 100)}%`} sub={`${summary.negative_count} posts`}  color="#f87171" />
                <MetricCard label="Avg Score" value={avgScore} sub="ensemble score" color="#a78bfa" />
              </div>

              {/* ── Row 2: Donut + Timeline ── */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
                {/* Donut */}
                <div className="card" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: 300 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", alignSelf: "flex-start" }}>Distribution</p>
                  <DonutChart slices={DONUT_SLICES(summary)} size={190} thickness={30} />
                  {/* Legend */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Positive", count: summary.positive_count, color: "#10b981" },
                      { label: "Neutral",  count: summary.neutral_count,  color: "#64748b" },
                      { label: "Negative", count: summary.negative_count, color: "#ef4444" },
                    ].map(({ label, count, color }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="card" style={{ padding: "28px 28px 20px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>
                    Sentiment Over Time
                  </p>
                  <TimelineChart posts={allPosts} />
                </div>
              </div>

              {/* ── Row 3: Post List ── */}
              <div>
                {/* Filter + Sort bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginRight: 4 }}>
                    {filtered.length} {filter !== "All" ? filter : ""} post{filtered.length !== 1 ? "s" : ""}
                  </p>

                  {/* Filter chips */}
                  <div style={{ display: "flex", gap: 6, flex: 1 }}>
                    {(["All", "Positive", "Neutral", "Negative"] as FilterKey[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                          padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: filter === f ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                          background: filter === f ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)",
                          color: filter === f ? "#c4b5fd" : "rgba(255,255,255,0.45)",
                          transition: "all 0.15s",
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Sort dropdown */}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="field-input"
                    style={{ width: "auto", fontSize: 12, padding: "6px 32px 6px 12px" }}
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Post cards */}
                {sorted.length === 0 ? (
                  <div className="card" style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                    No {filter.toLowerCase()} posts in this result set.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sorted.map((post, i) => (
                      <PostCard key={post.id} post={post} rank={i + 1} />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </main>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "18px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            Moodit · VADER + TextBlob + DistilBERT + Gemini AI
          </p>
        </footer>

      </div>
    </>
  );
}
