import { composeTag, drawFit, drawText, loadFont, newTxt } from "./tag";

let lid = 0;
export const newDeco = () => ({ front: { bg: null, layers: [] }, back: { bg: null, layers: [] } });
const BOX = { none: [10, 35, 80, 30], rect: [15, 30, 70, 40], ellipse: [20, 25, 60, 50], heart: [25, 25, 50, 45] };
export const newLayer = (shape) => {
  const [x, y, w, h] = BOX[shape];
  return { id: `${Date.now()}-${++lid}`, shape, x, y, w, h, rot: 0, radius: 0, fill: shape === "heart" ? "#E6007E" : "#FFFFFF", opacity: 85, border: false, borderColor: "#1F2937", txt: newTxt() };
};
export const hasDeco = (it, side) => {
  const d = it.deco?.[side];
  return !!(d && (d.bg || d.layers.length));
};
export const isComposed = (it) => !!it.tag || hasDeco(it, "front") || hasDeco(it, "back");

const HEART = [[75, 40, 75, 37, 70, 25, 50, 25], [20, 25, 20, 62.5, 20, 62.5], [20, 80, 40, 102, 75, 120], [110, 102, 130, 80, 130, 62.5], [130, 62.5, 130, 25, 100, 25], [85, 25, 75, 37, 75, 40]];
function heartPath(ctx, x, y, w, h) {
  const p = (px, py) => [x + ((px - 20) / 110) * w, y + ((py - 25) / 95) * h];
  ctx.moveTo(...p(HEART[0][0], HEART[0][1]));
  HEART.forEach((s, i) => {
    const c = i === 0 ? s.slice(2) : s;
    ctx.bezierCurveTo(...p(c[0], c[1]), ...p(c[2], c[3]), ...p(c[4], c[5]));
  });
  ctx.closePath();
}
const INSET = { ellipse: [0.15, 0.15], heart: [0.2, 0.22] };

function drawLayer(ctx, l, W, H) {
  const w = (l.w / 100) * W, h = (l.h / 100) * H;
  ctx.save();
  ctx.translate((l.x / 100) * W + w / 2, (l.y / 100) * H + h / 2);
  ctx.rotate(((l.rot || 0) * Math.PI) / 180);
  const x = -w / 2, y = -h / 2;
  if (l.shape !== "none") {
    ctx.beginPath();
    if (l.shape === "ellipse") ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (l.shape === "heart") heartPath(ctx, x, y, w, h);
    else if (l.radius) ctx.roundRect(x, y, w, h, ((l.radius / 100) * Math.min(w, h)) / 2);
    else ctx.rect(x, y, w, h);
    ctx.globalAlpha = l.opacity / 100;
    ctx.fillStyle = l.fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (l.border) {
      ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.008);
      ctx.strokeStyle = l.borderColor;
      ctx.stroke();
    }
  }
  const [ix, iy] = INSET[l.shape] || [0, 0];
  drawText(ctx, l.txt, x + w * ix, y + h * iy, w * (1 - 2 * ix), h * (1 - 2 * iy));
  ctx.restore();
}

// Renders one side of an item: background colour, image, then shapes and texts on top.
export async function composeSide(item, side, wcm, hcm, dpi) {
  const d = item.deco?.[side];
  let cv;
  if (item.tag) cv = await composeTag(item, side, wcm, hcm, dpi, d?.bg);
  else {
    const k = dpi / 2.54;
    cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(wcm * k));
    cv.height = Math.max(1, Math.round(hcm * k));
    const ctx = cv.getContext("2d");
    ctx.fillStyle = d?.bg || "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const img = side === "front" ? item.front : item.back;
    if (img) drawFit(ctx, img, 0, 0, cv.width, cv.height, item.fit);
  }
  const ctx = cv.getContext("2d");
  for (const l of d?.layers || []) {
    await loadFont(l.txt);
    drawLayer(ctx, l, cv.width, cv.height);
  }
  return cv;
}
