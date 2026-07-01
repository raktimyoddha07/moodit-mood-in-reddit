"use client";

import { useState } from "react";
import { Post } from "@/lib/api";

const LABEL_STYLE: Record<string, { bg: string; color: string; border: string; bar: string }> = {
  Positive: { bg: "rgba(16,185,129,0.08)",  color: "#34d399", border: "rgba(16,185,129,0.25)",  bar: "#10b981" },
  Neutral:  { bg: "rgba(148,163,184,0.06)", color: "#94a3b8", border: "rgba(148,163,184,0.18)", bar: "#64748b" },
  Negative: { bg: "rgba(239,68,68,0.08)",   color: "#f87171", border: "rgba(239,68,68,0.25)",   bar: "#ef4444" },
};

const ENTITY_COLORS: Record<string, string> = {
  PERSON: "#a78bfa", ORG: "#60a5fa", GPE: "#34d399", EVENT: "#fb923c",
  PRODUCT: "#f472b6", MONEY: "#facc15", LAW: "#94a3b8", NORP: "#c084fc", WORK_OF_ART: "#67e8f9",
};

interface Props { post: Post; rank?: number; }

export default function PostCard({ post, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const s     = LABEL_STYLE[post.sentiment.label] ?? LABEL_STYLE.Neutral;
  const score = post.sentiment.ensemble_score;
  const pct   = Math.min(Math.abs(score) * 100, 100);

  const fmtScore = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(3);
  const fmtDate  = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    } catch { return iso; }
  };

  return (
    <article
      style={{
        borderRadius: 16,
        border: `1px solid ${s.border}`,
        background: s.bg,
        overflow: "hidden",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${s.border}`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)";    (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", gap: 0 }}>
        {/* Coloured left stripe */}
        <div style={{ width: 4, background: s.bar, flexShrink: 0, borderRadius: "4px 0 0 4px" }} />

        <div style={{ flex: 1, padding: "20px 22px" }}>

          {/* Top row: label badge + score + rank + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            {rank !== undefined && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600, minWidth: 26 }}>#{rank}</span>
            )}
            <span style={{
              padding: "3px 10px", borderRadius: 999,
              background: `${s.bar}22`, border: `1px solid ${s.border}`,
              color: s.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
            }}>
              {post.sentiment.label.toUpperCase()}
            </span>


            <span style={{
              fontFamily: "monospace", fontSize: 13, fontWeight: 700,
              color: score > 0.1 ? "#34d399" : score < -0.1 ? "#f87171" : "#94a3b8",
            }}>
              {fmtScore(score)}
            </span>

            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              {fmtDate(post.created_utc)}
            </span>
          </div>

          {/* Title */}
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.55, marginBottom: 14 }}>
            {post.title}
          </p>

          {/* Score bars */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { l: "VADER",       v: post.sentiment.vader_score,    c: "#10b981" },
              { l: "TextBlob",    v: post.sentiment.blob_score,     c: "#3b82f6" },
              { l: "DistilBERT",  v: post.sentiment.bert_score,     c: "#7c3aed" },
            ].map(({ l, v, c }) => (
              <div key={l}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.06em" }}>{l}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: v > 0.05 ? "#34d399" : v < -0.05 ? "#f87171" : "#94a3b8", fontFamily: "monospace" }}>
                    {fmtScore(v)}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, background: c,
                    width: `${Math.min(Math.abs(v) * 100, 100)}%`,
                    marginLeft: v < 0 ? "auto" : 0,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Entities */}
          {post.entities.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {post.entities.slice(0, 10).map((ent, i) => (
                <span key={i} style={{
                  padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                  background: `${ENTITY_COLORS[ent.label] || "#94a3b8"}18`,
                  border: `1px solid ${ENTITY_COLORS[ent.label] || "#94a3b8"}33`,
                  color: ENTITY_COLORS[ent.label] || "#94a3b8",
                }}>
                  {ent.text}
                  <span style={{ opacity: 0.5, marginLeft: 4, fontSize: 9 }}>{ent.label}</span>
                </span>
              ))}
            </div>
          )}

        </div>
      </div>
    </article>
  );
}
