// Client-side text utilities for word frequency, bigrams, and CSV export
import { Post } from "@/lib/api";

const STOPWORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","was",
  "are","were","be","been","being","have","has","had","do","does","did","will","would","could",
  "should","may","might","shall","can","not","no","nor","so","yet","both","either","neither",
  "each","few","more","most","other","some","such","than","too","very","just","also","as","if",
  "it","its","this","that","these","those","they","them","their","theirs","he","she","him","her",
  "we","us","our","ours","you","your","yours","i","me","my","mine","what","which","who","whom",
  "when","where","why","how","all","any","both","each","every","much","own","same","s","t","re",
  "ve","ll","d","m","r","https","http","www","com","reddit","post","like","get","got","one",
  "new","even","back","go","going","make","think","know","see","need","time","way","really",
  "still","now","then","there","here","about","up","out","into","through","during","before",
  "after","above","below","between","against","since","without","within","along","following",
  "across","behind","beyond","plus","except","until","around","among","your","their","our"
]);

/** Tokenise text into cleaned words, stripping stopwords */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9$%+-\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Word frequencies for a list of posts */
export function wordFrequency(posts: Post[], topN = 60): [string, number][] {
  const freq = new Map<string, number>();
  for (const post of posts) {
    for (const w of tokenise(post.text)) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
}

/** Top bigrams */
export function topBigrams(posts: Post[], topN = 15): [string, number][] {
  const freq = new Map<string, number>();
  for (const post of posts) {
    const words = tokenise(post.text);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
}

/** Top entities grouped by label */
export function groupEntities(posts: Post[]): Record<string, [string, number][]> {
  const map = new Map<string, Map<string, number>>();
  for (const post of posts) {
    for (const ent of post.entities) {
      if (!map.has(ent.label)) map.set(ent.label, new Map());
      const inner = map.get(ent.label)!;
      inner.set(ent.text, (inner.get(ent.text) || 0) + 1);
    }
  }
  const result: Record<string, [string, number][]> = {};
  for (const [label, inner] of map.entries()) {
    result[label] = [...inner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }
  return result;
}

/** Generate and trigger CSV download from posts */
export function downloadCSV(posts: Post[], filename = "moodit_results.csv") {
  const headers = [
    "reddit_id","title","created_utc","label","ensemble_score",
    "vader_score","blob_score","bert_score","bert_confidence","entities","has_explanation"
  ];
  const rows = posts.map((p) => [
    p.reddit_id,
    `"${(p.title || "").replace(/"/g, '""')}"`,
    p.created_utc,
    p.sentiment.label,
    p.sentiment.ensemble_score,
    p.sentiment.vader_score,
    p.sentiment.blob_score,
    p.sentiment.bert_score,
    p.sentiment.bert_confidence,
    `"${p.entities.map((e) => `${e.text}(${e.label})`).join("; ")}"`,
    p.explanation ? "yes" : "no",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
