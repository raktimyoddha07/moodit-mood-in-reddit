"use client";

import { useMemo } from "react";
import { groupEntities } from "@/lib/textUtils";
import { Post } from "@/lib/api";

const ENTITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PERSON:      { bg: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  ORG:         { bg: "rgba(96,165,250,0.1)",  color: "#60a5fa", border: "rgba(96,165,250,0.25)"  },
  GPE:         { bg: "rgba(52,211,153,0.1)",  color: "#34d399", border: "rgba(52,211,153,0.25)"  },
  EVENT:       { bg: "rgba(251,146,60,0.1)",  color: "#fb923c", border: "rgba(251,146,60,0.25)"  },
  PRODUCT:     { bg: "rgba(244,114,182,0.1)", color: "#f472b6", border: "rgba(244,114,182,0.25)" },
  MONEY:       { bg: "rgba(250,204,21,0.1)",  color: "#facc15", border: "rgba(250,204,21,0.25)"  },
  LAW:         { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.25)" },
  NORP:        { bg: "rgba(192,132,252,0.1)", color: "#c084fc", border: "rgba(192,132,252,0.25)" },
  WORK_OF_ART: { bg: "rgba(103,232,249,0.1)", color: "#67e8f9", border: "rgba(103,232,249,0.25)" },
};

const DEFAULT_COLOR = { bg: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "rgba(255,255,255,0.1)" };

const LABEL_NAMES: Record<string, string> = {
  PERSON: "People", ORG: "Organizations", GPE: "Locations", EVENT: "Events",
  PRODUCT: "Products", MONEY: "Money", LAW: "Laws", NORP: "Groups", WORK_OF_ART: "Works of Art",
};

interface Props { posts: Post[]; }

export default function EntitiesTable({ posts }: Props) {
  const grouped = useMemo(() => groupEntities(posts), [posts]);
  const labels  = Object.keys(grouped).sort();

  if (labels.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "32px 0" }}>
        No entities extracted — try enabling more entity types in your search.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {labels.map((label) => {
        const style   = ENTITY_COLORS[label] ?? DEFAULT_COLOR;
        const entries = grouped[label];
        const maxCnt  = entries[0]?.[1] ?? 1;

        return (
          <div key={label}>
            {/* Label header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 999,
                background: style.bg, border: `1px solid ${style.border}`,
                color: style.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                {LABEL_NAMES[label] || label} · {entries.length} unique
              </span>
            </div>

            {/* Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map(([text, count]) => {
                const barPct = (count / maxCnt) * 100;
                return (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", minWidth: 140, fontWeight: 500 }}>
                      {text}
                    </span>
                    {/* Bar */}
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3, width: `${barPct}%`,
                        background: `linear-gradient(90deg, ${style.color}88, ${style.color})`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: style.color, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
