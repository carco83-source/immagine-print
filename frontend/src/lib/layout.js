export const SHEETS = {
  A4: { w: 21.0, h: 29.7, label: "A4", desc: "210 × 297 mm" },
  A3: { w: 29.7, h: 42.0, label: "A3", desc: "297 × 420 mm" },
  "32x45": { w: 32.0, h: 45.0, label: "32×45", desc: "320 × 450 mm" },
  A5: { w: 14.8, h: 21.0, label: "A5", desc: "148 × 210 mm" },
};

export const MARK_OFFSET = 0.2;
export const MARK_LEN = 0.5;

export function computeLayout(p) {
  let { w: W, h: H } = SHEETS[p.sheet];
  if (p.orientation === "landscape") [W, H] = [H, W];
  const aw = W - p.margin_left - p.margin_right;
  const ah = H - p.margin_top - p.margin_bottom;
  const valid = p.width > 0 && p.height > 0;
  const cols = valid ? Math.max(0, Math.floor((aw + p.gap + 1e-9) / (p.width + p.gap))) : 0;
  const rows = valid ? Math.max(0, Math.floor((ah + p.gap + 1e-9) / (p.height + p.gap))) : 0;
  const cap = cols * rows;
  const n = p.copies === 0 ? cap : Math.min(p.copies, cap);
  const usedCols = Math.min(n, cols);
  const usedRows = cols ? Math.ceil(n / cols) : 0;
  const bw = usedCols * p.width + Math.max(0, usedCols - 1) * p.gap;
  const bh = usedRows * p.height + Math.max(0, usedRows - 1) * p.gap;
  const x0 = p.margin_left + (aw - bw) / 2;
  const y0 = p.margin_top + (ah - bh) / 2;
  const pos = Array.from({ length: n }, (_, i) => [
    x0 + (i % cols) * (p.width + p.gap),
    y0 + Math.floor(i / cols) * (p.height + p.gap),
  ]);
  return { W, H, cap, n, cols, rows, pos, x0, y0, bw, bh, usedCols, usedRows };
}

export function backPositions(lay, p) {
  if (p.flip === "long") return lay.pos.map(([x, y]) => [lay.W - x - p.width, y]);
  return lay.pos.map(([x, y]) => [x, lay.H - y - p.height]);
}

export function cutLines(lay, p) {
  const xs = new Set();
  const ys = new Set();
  for (let c = 0; c < lay.usedCols; c++) {
    const x = lay.x0 + c * (p.width + p.gap);
    xs.add(+x.toFixed(4)).add(+(x + p.width).toFixed(4));
  }
  for (let r = 0; r < lay.usedRows; r++) {
    const y = lay.y0 + r * (p.height + p.gap);
    ys.add(+y.toFixed(4)).add(+(y + p.height).toFixed(4));
  }
  const top = lay.y0, bottom = lay.y0 + lay.bh, left = lay.x0, right = lay.x0 + lay.bw;
  const o = MARK_OFFSET, l = MARK_LEN;
  const lines = [];
  xs.forEach((x) => {
    lines.push([x, top - o - l, x, top - o], [x, bottom + o, x, bottom + o + l]);
  });
  ys.forEach((y) => {
    lines.push([left - o - l, y, left - o, y], [right + o, y, right + o + l, y]);
  });
  return lines;
}
