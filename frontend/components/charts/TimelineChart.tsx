// Pure SVG Timeline Chart — groups posts by hour bucket and plots counts per sentiment label
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Post } from "@/lib/api";

const COLORS = { Positive: "#10b981", Neutral: "#94a3b8", Negative: "#ef4444" };
const LABELS = ["Positive", "Neutral", "Negative"] as const;

interface Props { posts: Post[]; }

export default function TimelineChart({ posts }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!posts.length) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>No timeline data</p>
      </div>
    );
  }

  // Sort posts by date
  const sorted = [...posts].sort((a, b) => new Date(a.created_utc).getTime() - new Date(b.created_utc).getTime());

  // Build hourly buckets
  const bucketMap = new Map<string, Record<string, number>>();
  for (const post of sorted) {
    const d = new Date(post.created_utc);
    // Format to a human-readable local time: e.g., "Jul 1, 3 PM"
    const key = d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      hour12: true,
    });
    if (!bucketMap.has(key)) bucketMap.set(key, { Positive: 0, Neutral: 0, Negative: 0 });
    const b = bucketMap.get(key)!;
    b[post.sentiment.label] = (b[post.sentiment.label] || 0) + 1;
  }

  // If fewer than 3 buckets, group by individual post instead
  let buckets: { key: string; Positive: number; Neutral: number; Negative: number }[];
  if (bucketMap.size < 2) {
    buckets = sorted.map((p, i) => ({
      key:      `#${i + 1}`,
      Positive: p.sentiment.label === "Positive" ? 1 : 0,
      Neutral:  p.sentiment.label === "Neutral"  ? 1 : 0,
      Negative: p.sentiment.label === "Negative" ? 1 : 0,
    }));
  } else {
    buckets = Array.from(bucketMap.entries()).map(([key, v]) => ({ key, ...v } as typeof buckets[0]));
  }

  // Dimension settings
  const W = 600;
  const H = 240;
  const PAD = { top: 24, right: 24, bottom: 44, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...buckets.map((b) => b.Positive + b.Neutral + b.Negative), 1);
  const xStep  = chartW / (buckets.length - 1 || 1);

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top  + chartH * (1 - v / maxVal);

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal));

  const renderChartContent = (isModal = false) => {
    const actualW = isModal ? 900 : W;
    const actualH = isModal ? 400 : H;
    const curChartW = actualW - PAD.left - PAD.right;
    const curChartH = actualH - PAD.top - PAD.bottom;
    const curXStep  = curChartW / (buckets.length - 1 || 1);
    
    const curToX = (i: number) => PAD.left + i * curXStep;
    const curToY = (v: number) => PAD.top  + curChartH * (1 - v / maxVal);

    const curMakeBezierPath = (label: typeof LABELS[number]) => {
      if (buckets.length < 2) return "";
      let path = `M ${curToX(0)} ${curToY(buckets[0][label])}`;
      for (let i = 0; i < buckets.length - 1; i++) {
        const x0 = curToX(i);
        const y0 = curToY(buckets[i][label]);
        const x1 = curToX(i + 1);
        const y1 = curToY(buckets[i + 1][label]);
        const cpX1 = x0 + (x1 - x0) / 2;
        const cpY1 = y0;
        const cpX2 = x0 + (x1 - x0) / 2;
        const cpY2 = y1;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x1} ${y1}`;
      }
      return path;
    };

    const curMakeBezierAreaPath = (label: typeof LABELS[number]) => {
      const linePath = curMakeBezierPath(label);
      if (!linePath) return "";
      return `${linePath} L ${curToX(buckets.length - 1)} ${PAD.top + curChartH} L ${curToX(0)} ${PAD.top + curChartH} Z`;
    };

    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${actualW} ${actualH}`} 
        style={{ overflow: "visible" }}
      >
        {/* Gradients */}
        <defs>
          {LABELS.map((label) => (
            <linearGradient key={label} id={`grad-${label}-${isModal ? 'modal' : 'normal'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={COLORS[label]} stopOpacity={0.15} />
              <stop offset="100%" stopColor={COLORS[label]} stopOpacity={0}    />
            </linearGradient>
          ))}
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left} y1={curToY(v)} x2={actualW - PAD.right} y2={curToY(v)}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text x={PAD.left - 8} y={curToY(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="Inter, sans-serif">{v}</text>
          </g>
        ))}

        {/* Hover guidance vertical line */}
        {hoveredIndex !== null && (
          <line
            x1={curToX(hoveredIndex)}
            y1={PAD.top}
            x2={curToX(hoveredIndex)}
            y2={actualH - PAD.bottom}
            stroke="rgba(99,102,241,0.3)"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
        )}

        {/* Paths & Areas */}
        {LABELS.map((label) => (
          <g key={label}>
            <path
              d={curMakeBezierAreaPath(label)}
              fill={`url(#grad-${label}-${isModal ? 'modal' : 'normal'})`}
            />
            <path
              d={curMakeBezierPath(label)}
              fill="none"
              stroke={COLORS[label]}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            {/* Dots on points */}
            {buckets.map((b, i) => (
              <circle
                key={i}
                cx={curToX(i)}
                cy={curToY(b[label])}
                r={hoveredIndex === i ? 5 : 3.5}
                fill={COLORS[label]}
                stroke="#0b0f19"
                strokeWidth={hoveredIndex === i ? 2 : 1}
                style={{ transition: "r 0.15s, stroke-width 0.15s" }}
              />
            ))}
          </g>
        ))}

        {/* X axis labels — show max 7 */}
        {buckets
          .filter((_, i) => buckets.length <= 7 || i % Math.ceil(buckets.length / 6) === 0)
          .map((b) => {
            const i = buckets.indexOf(b);
            return (
              <text key={b.key} x={curToX(i)} y={actualH - 20} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10} fontFamily="Inter, sans-serif">
                {b.key}
              </text>
            );
          })}

        {/* Legend */}
        {LABELS.map((label, i) => (
          <g key={label} transform={`translate(${PAD.left + i * 100}, ${actualH - 4})`}>
            <circle cx={4} cy={-4} r={4} fill={COLORS[label]} />
            <text x={14} y={0} fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily="Inter, sans-serif">{label}</text>
          </g>
        ))}

        {/* Invisible columns for hover detection */}
        {buckets.map((_, i) => (
          <rect
            key={i}
            x={curToX(i) - curXStep / 2}
            y={PAD.top}
            width={curXStep}
            height={curChartH}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>
    );
  };

  // Fullscreen Modal Content (using Portal to escape parent transforms)
  const modalContent = isExpanded && (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(6, 9, 17, 0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 99999, transition: "opacity 0.2s"
    }}>
      <div className="card fade-up" style={{
        width: "90%", maxWidth: 1000, padding: "32px", position: "relative",
        background: "#0c1122", border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)"
      }}>
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>Sentiment Over Time</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0 0" }}>Detailed hourly distribution breakdown</p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)",
              transition: "all 0.2s", fontSize: 16, fontWeight: "bold"
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Chart Container */}
        <div style={{ position: "relative", width: "100%", height: 400 }}>
          {renderChartContent(true)}

          {/* Modal Tooltip */}
          {hoveredIndex !== null && (
            <div style={{
              position: "absolute",
              left: `${Math.min(Math.max(( (PAD.left + hoveredIndex * (900 - PAD.left - PAD.right) / (buckets.length - 1 || 1)) / 900) * 100, 10), 90)}%`,
              top: 20,
              transform: "translateX(-50%)",
              background: "rgba(15,15,30,0.95)",
              border: "1px solid rgba(124,58,237,0.4)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
              borderRadius: 8,
              padding: "10px 16px",
              pointerEvents: "none",
              zIndex: 30
            }}>
              <p style={{ margin: "0 0 6px 0", fontSize: 12, fontWeight: 700, color: "#a78bfa", textAlign: "center" }}>
                Time: {buckets[hoveredIndex].key}
              </p>
              <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                <span style={{ color: "#34d399" }}>● Positive: {buckets[hoveredIndex].Positive}</span>
                <span style={{ color: "#94a3b8" }}>● Neutral: {buckets[hoveredIndex].Neutral}</span>
                <span style={{ color: "#f87171" }}>● Negative: {buckets[hoveredIndex].Negative}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Expand Icon Button */}
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          position: "absolute", right: 0, top: -42,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)",
          transition: "background 0.2s, color 0.2s", zIndex: 10
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
        title="Maximize Chart"
      >
        <span style={{ fontSize: 13, transform: "rotate(45deg)", display: "inline-block", fontWeight: "bold" }}>↕</span>
      </button>

      {/* Main Mini Chart View */}
      <div style={{ position: "relative", padding: "4px 0" }}>
        {renderChartContent(false)}

        {/* Interactive Tooltip */}
        {hoveredIndex !== null && (
          <div style={{
            position: "absolute",
            left: `${Math.min(Math.max((toX(hoveredIndex) / W) * 100, 10), 90)}%`,
            top: -12,
            transform: "translate(-50%, -100%)",
            background: "rgba(15,15,30,0.95)",
            border: "1px solid rgba(99,102,241,0.3)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.8), 0 0 10px rgba(99,102,241,0.1)",
            borderRadius: 8,
            padding: "8px 12px",
            pointerEvents: "none",
            zIndex: 30,
            transition: "left 0.1s ease-out, top 0.1s ease-out"
          }}>
            <p style={{ margin: "0 0 6px 0", fontSize: 11, fontWeight: 700, color: "#a78bfa", textAlign: "center" }}>
              Time: {buckets[hoveredIndex].key}
            </p>
            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
              <span style={{ color: "#34d399" }}>● Pos: {buckets[hoveredIndex].Positive}</span>
              <span style={{ color: "#94a3b8" }}>● Neu: {buckets[hoveredIndex].Neutral}</span>
              <span style={{ color: "#f87171" }}>● Neg: {buckets[hoveredIndex].Negative}</span>
            </div>
          </div>
        )}
      </div>

      {/* Portal-rendered Modal */}
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </div>
  );
}
