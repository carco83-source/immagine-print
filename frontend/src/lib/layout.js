export const SHEETS = {
  A4: { w: 21.0, h: 29.7, label: "A4", desc: "210 × 297" },
  A3: { w: 29.7, h: 42.0, label: "A3", desc: "297 × 420" },
  "32x45": { w: 32.0, h: 45.0, label: "32×45", desc: "320 × 450" },
  A5: { w: 14.8, h: 21.0, label: "A5", desc: "148 × 210" },
};

const O = 0.2;
const L = 0.5;
const EPS = 1e-6;

export function sheetDims(p) {
  const { w, h } = SHEETS[p.sheet];
  return p.orientation === "landscape" ? [h, w] : [w, h];
}

export const tileSize = (it, p) => (p.duplex ? [p.width, p.height] : [it.width, it.height]);

export function capacity(w, h, p) {
  const [W, H] = sheetDims(p);
  const aw = W - p.margin_left - p.margin_right;
  const ah = H - p.margin_top - p.margin_bottom;
  if (!(w > 0 && h > 0)) return 0;
  const cols = Math.max(0, Math.floor((aw + p.gap + EPS) / (w + p.gap)));
  const rows = Math.max(0, Math.floor((ah + p.gap + EPS) / (h + p.gap)));
  return cols * rows;
}

export function computePages(items, p) {
  const [W, H] = sheetDims(p);
  const aw = W - p.margin_left - p.margin_right;
  const ah = H - p.margin_top - p.margin_bottom;
  const pages = [];
  let cur = [], x = 0, y = 0, rowH = 0, unfit = 0, total = 0;
  items.forEach((it, idx) => {
    const [w, h] = tileSize(it, p);
    const copies = Math.max(0, it.copies || 0);
    if (!(w > 0 && h > 0) || w > aw + EPS || h > ah + EPS) { unfit += copies; return; }
    for (let i = 0; i < copies; i++) {
      if (x > 0 && x + w > aw + EPS) { y += rowH + p.gap; x = 0; rowH = 0; }
      if (y + h > ah + EPS) { pages.push(cur); cur = []; x = 0; y = 0; rowH = 0; }
      cur.push({ idx, x, y, w, h });
      x += w + p.gap;
      rowH = Math.max(rowH, h);
      total++;
    }
  });
  if (cur.length) pages.push(cur);
  pages.forEach((page) => {
    const ox = p.margin_left + (aw - Math.max(...page.map((t) => t.x + t.w))) / 2;
    const oy = p.margin_top + (ah - Math.max(...page.map((t) => t.y + t.h))) / 2;
    page.forEach((t) => { t.x += ox; t.y += oy; });
  });
  return { W, H, pages, unfit, total };
}

export function backTiles(page, W, H, p) {
  if (p.flip === "long") return page.map((t) => ({ ...t, x: W - t.x - t.w }));
  return page.map((t) => ({ ...t, y: H - t.y - t.h }));
}

const hits = ([x1, y1, x2, y2], tiles) =>
  tiles.some((t) =>
    x1 === x2
      ? t.x - EPS <= x1 && x1 <= t.x + t.w + EPS && Math.min(y1, y2) < t.y + t.h - EPS && Math.max(y1, y2) > t.y + EPS
      : t.y - EPS <= y1 && y1 <= t.y + t.h + EPS && Math.min(x1, x2) < t.x + t.w - EPS && Math.max(x1, x2) > t.x + EPS
  );

export function cutLines(page) {
  const segs = [];
  page.forEach((t) => {
    [t.x, t.x + t.w].forEach((x) => {
      segs.push([x, t.y - O - L, x, t.y - O], [x, t.y + t.h + O, x, t.y + t.h + O + L]);
    });
    [t.y, t.y + t.h].forEach((y) => {
      segs.push([t.x - O - L, y, t.x - O, y], [t.x + t.w + O, y, t.x + t.w + O + L, y]);
    });
  });
  return segs.filter((s) => !hits(s, page));
}

const CROSS = 0.2;

export function innerCrosses(page) {
  const pts = new Map();
  page.forEach((t) => {
    [[t.x, -1], [t.x + t.w, 1]].forEach(([x, sx]) => {
      [[t.y, -1], [t.y + t.h, 1]].forEach(([y, sy]) => {
        const v = [x, y + sy * O, x, y + sy * (O + L)];
        const h = [x + sx * O, y, x + sx * (O + L), y];
        if (hits(v, page) || hits(h, page)) pts.set(`${x.toFixed(4)},${y.toFixed(4)}`, [x, y]);
      });
    });
  });
  return [...pts.values()].flatMap(([x, y]) => [[x - CROSS, y, x + CROSS, y], [x, y - CROSS, x, y + CROSS]]);
}
