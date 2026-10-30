import { composeTag, drawFit, drawText, loadFont, newTxt } from "./tag";

let lid = 0;
export const newDeco = () => ({ front: { bg: null, layers: [] }, back: { bg: null, layers: [] } });
const BOX = { none: [10, 35, 80, 30], rect: [15, 30, 70, 40], ellipse: [20, 25, 60, 50] };
export const newLayer = (shape) => {
  const [x, y, w, h] = BOX[shape];
  return { id: `${Date.now()}-${++lid}`, shape, x, y, w, h, fill: "#FFFFFF", opacity: 85, border: false, borderColor: "#1F2937", txt: newTxt() };
};
export const hasDeco = (it, side) => {
  const d = it.deco?.[side];
  return !!(d && (d.bg || d.layers.length));
};
export const isComposed = (it) => !!it.tag || hasDeco(it, "front") || hasDeco(it, "back");

function drawLayer(ctx, l, W, H) {
  const x = (l.x / 100) * W, y = (l.y / 100) * H, w = (l.w / 100) * W, h = (l.h / 100) * H;
  if (l.shape !== "none") {
    ctx.beginPath();
    if (l.shape === "ellipse") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
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
  const inset = l.shape === "ellipse" ? 0.15 : 0;
  drawText(ctx, l.txt, x + w * inset, y + h * inset, w * (1 - 2 * inset), h * (1 - 2 * inset));
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
