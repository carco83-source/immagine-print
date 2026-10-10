import { backPositions, cutLines } from "../lib/layout";

const ASPECT = { cover: "xMidYMid slice", contain: "xMidYMid meet", stretch: "none" };

export const SheetPreview = ({ lay, p, image, side }) => {
  const isBack = side === "back";
  const positions = isBack ? backPositions(lay, p) : lay.pos;
  const rotate = isBack && p.flip === "short";
  const { W, H } = lay;
  return (
    <svg
      data-testid={`sheet-preview-${side}`}
      viewBox={`0 0 ${W} ${H}`}
      className="sheet h-full max-h-full w-auto max-w-full bg-white"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <rect
        x={p.margin_left} y={p.margin_top}
        width={Math.max(0, W - p.margin_left - p.margin_right)}
        height={Math.max(0, H - p.margin_top - p.margin_bottom)}
        fill="none" stroke="#00A8E8" strokeWidth={0.03} strokeDasharray="0.2 0.15"
      />
      {positions.map(([x, y], i) => (
        <g key={i} transform={rotate ? `rotate(180 ${x + p.width / 2} ${y + p.height / 2})` : undefined}>
          {image ? (
            <image href={image.url} x={x} y={y} width={p.width} height={p.height} preserveAspectRatio={ASPECT[p.fit]} />
          ) : (
            <rect x={x} y={y} width={p.width} height={p.height} fill="#E5E7EB" />
          )}
          <rect x={x} y={y} width={p.width} height={p.height} fill="none" stroke="#94A3B8" strokeWidth={0.015} />
          <text x={x + 0.25} y={y + 0.55} fontSize={0.4} fontFamily="JetBrains Mono, monospace" fill={isBack ? "#9333EA" : "#0B0F17"} opacity={0.55}>
            {i + 1}
          </text>
        </g>
      ))}
      {!isBack && p.cut_marks &&
        cutLines(lay, p).map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={0.025} />
        ))}
    </svg>
  );
};
