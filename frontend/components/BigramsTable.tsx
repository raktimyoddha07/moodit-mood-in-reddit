"use client";

import { useMemo } from "react";
import { topBigrams } from "@/lib/textUtils";
import { Post } from "@/lib/api";

interface Props { posts: Post[]; topN?: number; }

export default function BigramsTable({ posts, topN = 15 }: Props) {
  const bigrams = useMemo(() => topBigrams(posts, topN), [posts, topN]);

  if (bigrams.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "32px 0" }}>
        Not enough text to compute bigrams.
      </p>
    );
  }

  const maxCount = bigrams[0][1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bigrams.map(([bigram, count], i) => {
        const pct = (count / maxCount) * 100;
        return (
          <div key={bigram} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Rank */}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600, minWidth: 22, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {i + 1}
            </span>
            {/* Bigram text */}
            <span style={{
              fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)",
              minWidth: 180, fontFamily: "monospace",
              background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 10px",
            }}>
              {bigram}
            </span>
            {/* Bar */}
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${pct}%`,
                background: "linear-gradient(90deg, rgba(124,58,237,0.6), #7c3aed)",
                transition: "width 0.5s ease",
              }} />
            </div>
            {/* Count */}
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
