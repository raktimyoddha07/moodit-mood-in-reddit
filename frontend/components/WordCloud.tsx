"use client";

import { useMemo } from "react";
import { wordFrequency } from "@/lib/textUtils";
import { Post } from "@/lib/api";

const SENTIMENT_COLORS: Record<string, string[]> = {
  Positive: ["#34d399","#10b981","#6ee7b7","#a7f3d0","#059669","#d1fae5","#14b8a6"],
  Neutral:  ["#94a3b8","#64748b","#cbd5e1","#e2e8f0","#475569","#b0bec5","#90a4ae"],
  Negative: ["#f87171","#ef4444","#fca5a5","#fecaca","#dc2626","#ff6b6b","#ff8787"],
};

interface Props {
  posts: Post[];
  label: "Positive" | "Neutral" | "Negative";
}

export default function WordCloud({ posts, label }: Props) {
  const words = useMemo(() => wordFrequency(posts, 50), [posts]);
  const colors = SENTIMENT_COLORS[label];

  if (words.length === 0) {
    return (
      <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>No text data</p>
      </div>
    );
  }

  const maxFreq = words[0][1];

  return (
    <div style={{
      display:    "flex",
      flexWrap:   "wrap",
      gap:        "8px 10px",
      alignItems: "center",
      padding:    "4px 0",
      minHeight:  120,
    }}>
      {words.map(([word, freq], i) => {
        // Font size: 11–28px scaled to frequency
        const ratio    = freq / maxFreq;
        const fontSize = Math.round(11 + ratio * 17);
        const opacity  = 0.45 + ratio * 0.55;
        const color    = colors[i % colors.length];

        return (
          <span
            key={word}
            title={`"${word}" — ${freq} occurrence${freq !== 1 ? "s" : ""}`}
            style={{
              fontSize,
              fontWeight:   ratio > 0.5 ? 700 : 500,
              color,
              opacity,
              lineHeight:   1.3,
              cursor:       "default",
              transition:   "opacity 0.2s, transform 0.2s",
              display:      "inline-block",
              textShadow:   ratio > 0.65 ? `0 0 12px ${color}66` : "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLSpanElement).style.opacity = "1";
              (e.currentTarget as HTMLSpanElement).style.transform = "scale(1.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLSpanElement).style.opacity = String(opacity);
              (e.currentTarget as HTMLSpanElement).style.transform = "scale(1)";
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
