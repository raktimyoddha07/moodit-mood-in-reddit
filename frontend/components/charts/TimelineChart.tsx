// Pure SVG Timeline Chart — groups posts by hour bucket and plots counts per sentiment label
import { Post } from "@/lib/api";

const COLORS = { Positive: "#10b981", Neutral: "#94a3b8", Negative: "#ef4444" };
const LABELS = ["Positive", "Neutral", "Negative"] as const;

interface Props { posts: Post[]; }

export default function TimelineChart({ posts }: Props) {
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
    const d    = new Date(post.created_utc);
    const key  = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours()}h`;
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

  const W = 560; const H = 180;
  const PAD = { top: 16, right: 16, bottom: 36, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...buckets.map((b) => b.Positive + b.Neutral + b.Negative), 1);
  const xStep  = chartW / (buckets.length - 1 || 1);

  const toX = (i: number)        => PAD.left + i * xStep;
  const toY = (v: number)        => PAD.top  + chartH * (1 - v / maxVal);

  const makePath = (label: typeof LABELS[number]) =>
    buckets.map((b, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(b[label])}`).join(" ");

  // Y gridlines
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1}
          />
          <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={10} fontFamily="Inter,sans-serif">{v}</text>
        </g>
      ))}

      {/* Lines per label */}
      {LABELS.map((label) => (
        <g key={label}>
          {/* Gradient area fill */}
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={COLORS[label]} stopOpacity={0.15} />
              <stop offset="100%" stopColor={COLORS[label]} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <path
            d={`${makePath(label)} L ${toX(buckets.length - 1)} ${PAD.top + chartH} L ${toX(0)} ${PAD.top + chartH} Z`}
            fill={`url(#grad-${label})`}
          />
          <path
            d={makePath(label)}
            fill="none"
            stroke={COLORS[label]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${COLORS[label]}88)` }}
          />
          {/* Dots */}
          {buckets.map((b, i) => (
            <circle key={i} cx={toX(i)} cy={toY(b[label])} r={3} fill={COLORS[label]} />
          ))}
        </g>
      ))}

      {/* X axis labels — show max 7 */}
      {buckets
        .filter((_, i) => buckets.length <= 7 || i % Math.ceil(buckets.length / 6) === 0)
        .map((b, _, arr) => {
          const i = buckets.indexOf(b);
          return (
            <text key={b.key} x={toX(i)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={10} fontFamily="Inter,sans-serif">
              {b.key}
            </text>
          );
        })}

      {/* Legend */}
      {LABELS.map((label, i) => (
        <g key={label} transform={`translate(${PAD.left + i * 90}, ${H - 2})`}>
          <rect x={0} y={-8} width={10} height={3} rx={1.5} fill={COLORS[label]} />
          <text x={14} y={-2} fill="rgba(255,255,255,0.35)" fontSize={10} fontFamily="Inter,sans-serif">{label}</text>
        </g>
      ))}
    </svg>
  );
}
