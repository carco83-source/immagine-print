import { backTiles, cutLines } from "../lib/layout";

const ASPECT = { cover: "xMidYMid slice", contain: "xMidYMid meet", stretch: "none" };

export const SheetPreview = ({ info, page, p, items, side }) => {
  const isBack = side === "back";
  const { W, H } = info;
  const tiles = isBack ? backTiles(page, W, H, p) : page;
  const rotate = isBack && p.flip === "short";
  return (
    <svg data-testid={`sheet-preview-${side}`} viewBox={`0 0 ${W} ${H}`}
      className="sheet h-full max-h-full w-auto max-w-full bg-white" style={{ aspectRatio: `${W} / ${H}` }}>
      <rect x={p.margin_left} y={p.margin_top}
        width={Math.max(0, W - p.margin_left - p.margin_right)} height={Math.max(0, H - p.margin_top - p.margin_bottom)}
        fill="none" stroke="#00A8E8" strokeWidth={0.03} strokeDasharray="0.2 0.15" />
      {tiles.map((t, i) => {
        const img = isBack ? items[t.idx]?.back : items[t.idx]?.front;
        return (
          <g key={i} transform={rotate ? `rotate(180 ${t.x + t.w / 2} ${t.y + t.h / 2})` : undefined}>
            {img ? (
              <image href={img.url} x={t.x} y={t.y} width={t.w} height={t.h} preserveAspectRatio={ASPECT[p.fit]} />
            ) : (
              <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#E5E7EB" />
            )}
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="none" stroke="#94A3B8" strokeWidth={0.015} />
            <text x={t.x + 0.2} y={t.y + 0.5} fontSize={0.38} fontFamily="JetBrains Mono, monospace" fill={isBack ? "#9333EA" : "#0B0F17"} opacity={0.6}>
              {String.fromCharCode(65 + t.idx)}
            </text>
          </g>
        );
      })}
      {!isBack && p.cut_marks &&
        cutLines(page).map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={0.025} />)}
    </svg>
  );
};
