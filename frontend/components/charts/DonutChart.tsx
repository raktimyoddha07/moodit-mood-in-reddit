// Pure SVG Donut Chart
interface Slice {
  value: number;
  color: string;
  label: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
}

export default function DonutChart({ slices, size = 180, thickness = 28 }: Props) {
  const total   = slices.reduce((s, x) => s + x.value, 0) || 1;
  const radius  = (size - thickness) / 2;
  const cx      = size / 2;
  const cy      = size / 2;
  const circum  = 2 * Math.PI * radius;

  let currentAngle = -Math.PI / 2; // start at top

  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const ratio       = slice.value / total;
      const angleSpan   = ratio * 2 * Math.PI;
      const startAngle  = currentAngle;
      const endAngle    = currentAngle + angleSpan;
      currentAngle      = endAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = angleSpan > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      ].join(" ");

      return { d, color: slice.color, label: slice.label, pct: Math.round(ratio * 100) };
    });

  const dominant = slices.reduce((a, b) => (a.value >= b.value ? a : b));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {/* Track circle */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />

      {/* Slices */}
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={thickness}
          strokeLinecap="butt"
          style={{ filter: `drop-shadow(0 0 6px ${p.color}66)` }}
        />
      ))}

      {/* Centre text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={dominant.color} fontSize={24} fontWeight={800} fontFamily="Inter,sans-serif">
        {Math.round((dominant.value / total) * 100)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={11} fontFamily="Inter,sans-serif" letterSpacing="0.05em">
        {dominant.label.toUpperCase()}
      </text>
    </svg>
  );
}
