import { useSyncExternalStore } from "react";

export const TAG_W = 9;
export const TAG_H = 2.5;

export const TAG_FONTS = [
  { label: "Edwardian Script ITC", family: "'Edwardian Script ITC', 'Great Vibes'", note: "se non installato: Great Vibes" },
  { label: "Snell Roundhand", family: "'Snell Roundhand', 'Pinyon Script'", note: "se non installato: Pinyon Script" },
  { label: "Alex Brush", family: "'Alex Brush'" },
  { label: "Times New Roman", family: "'Times New Roman', Tinos", note: "se non installato: Tinos" },
];

let custom = [];
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const useFonts = () => useSyncExternalStore(subscribe, () => custom);

export async function addFontFile(file) {
  const name = file.name.replace(/\.\w+$/, "");
  const face = new FontFace(name, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  const family = `'${name}'`;
  if (!custom.some((f) => f.family === family)) custom = [...custom, { label: name, family, note: "caricato" }];
  listeners.forEach((fn) => fn());
  return family;
}

function drawFit(ctx, img, x, y, w, h, fit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (fit === "stretch") ctx.drawImage(img.el, x, y, w, h);
  else {
    const s = fit === "cover" ? Math.max(w / img.w, h / img.h) : Math.min(w / img.w, h / img.h);
    const dw = img.w * s, dh = img.h * s;
    ctx.drawImage(img.el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  ctx.restore();
}

// Auto-fits multi-line text centered inside the zone.
function drawText(ctx, text, family, color, x, y, w, h) {
  const lines = text.split("\n");
  if (!text.trim()) return;
  const pad = Math.min(w, h) * 0.1;
  const aw = w - 2 * pad, ah = h - 2 * pad;
  let size = ah / (lines.length * 1.15);
  ctx.font = `${size}px ${family}`;
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (maxW > aw) size *= aw / maxW;
  ctx.font = `${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = size * 1.15;
  const top = y + h / 2 - (lh * (lines.length - 1)) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, top + i * lh));
}

// Renders a bomboniera tag tile: image (front) or text (back) in the right half.
export async function composeTag(item, side, wcm, hcm, dpi) {
  const k = dpi / 2.54;
  const W = Math.max(1, Math.round(wcm * k)), H = Math.max(1, Math.round(hcm * k));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  const zx = Math.round(W / 2), zw = W - zx;
  if (side === "front" && item.front) drawFit(ctx, item.front, zx, 0, zw, H, item.fit);
  if (side === "back") {
    await document.fonts.load(`40px ${item.font}`, item.text || "a");
    drawText(ctx, item.text || "", item.font, item.color, zx, 0, zw, H);
  }
  return cv;
}

export const canvasBlob = (cv, name) =>
  new Promise((res) => cv.toBlob((b) => res(new File([b], name, { type: "image/png" })), "image/png"));
