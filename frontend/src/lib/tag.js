import { useSyncExternalStore } from "react";
import { saveFont, getFont } from "./db";

export const TAG_W = 9;
export const TAG_H = 2.5;

export const TAG_FONTS = [
  { label: "Edwardian Script ITC", family: "'Edwardian Script ITC', 'Great Vibes'", note: "se non installato: Great Vibes" },
  { label: "Snell Roundhand", family: "'Snell Roundhand', 'Pinyon Script'", note: "se non installato: Pinyon Script" },
  { label: "Alex Brush", family: "'Alex Brush'" },
  { label: "Times New Roman", family: "'Times New Roman', Tinos", note: "se non installato: Tinos" },
];

export const newTxt = (extra = {}) => ({ text: "", font: TAG_FONTS[0].family, color: "#1F2937", bold: false, italic: false, align: "center", ...extra });

let custom = [];
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const useFonts = () => useSyncExternalStore(subscribe, () => custom);
const isCustom = (family) => custom.some((f) => f.family === family);
const nameOf = (family) => family.replace(/^'|'$/g, "");

async function register(name, data) {
  const face = new FontFace(name, data);
  await face.load();
  document.fonts.add(face);
  const family = `'${name}'`;
  if (!isCustom(family)) custom = [...custom, { label: name, family, note: "caricato" }];
  listeners.forEach((fn) => fn());
  return family;
}

export async function addFontFile(file) {
  const name = file.name.replace(/\.\w+$/, "").replace(/['"\\]/g, "");
  const family = await register(name, await file.arrayBuffer());
  await saveFont(name, file);
  return family;
}

export const customFontNames = (families) => families.filter(isCustom).map(nameOf);

export async function restoreFonts(names) {
  for (const name of names) {
    if (isCustom(`'${name}'`)) continue;
    const rec = await getFont(name);
    if (rec) await register(name, await rec.blob.arrayBuffer());
  }
}

export function drawFit(ctx, img, x, y, w, h, fit) {
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

const fontCss = (c, size) => `${c.italic ? "italic " : ""}${c.bold ? "bold " : ""}${size}px ${c.font}`;

// Auto-fits multi-line text inside the zone with the chosen style and alignment.
export function drawText(ctx, c, x, y, w, h) {
  if (!c?.text?.trim()) return;
  const lines = c.text.split("\n");
  const pad = Math.min(w, h) * 0.1;
  const aw = w - 2 * pad, ah = h - 2 * pad;
  let size = ah / (lines.length * 1.15);
  ctx.font = fontCss(c, size);
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (maxW > aw) size *= aw / maxW;
  ctx.font = fontCss(c, size);
  ctx.fillStyle = c.color;
  ctx.textAlign = c.align;
  ctx.textBaseline = "middle";
  const tx = c.align === "left" ? x + pad : c.align === "right" ? x + w - pad : x + w / 2;
  const lh = size * 1.15;
  const top = y + h / 2 - (lh * (lines.length - 1)) / 2;
  lines.forEach((l, i) => ctx.fillText(l, tx, top + i * lh));
}

export const loadFont = (c) => (c?.text?.trim() ? document.fonts.load(fontCss(c, 40), c.text) : null);

// Renders a bomboniera tag tile: image (+ optional text) on the front, text on the back, right half.
export async function composeTag(item, side, wcm, hcm, dpi, bg) {
  const k = dpi / 2.54;
  const W = Math.max(1, Math.round(wcm * k)), H = Math.max(1, Math.round(hcm * k));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = bg || "#fff";
  ctx.fillRect(0, 0, W, H);
  const zx = Math.round(W / 2), zw = W - zx;
  if (side === "front") {
    if (item.front) drawFit(ctx, item.front, zx, 0, zw, H, item.fit);
    if (!item.frontTxt?.on) return cv;
    await loadFont(item.frontTxt);
    if (item.frontTxt.pos === "left") drawText(ctx, item.frontTxt, 0, 0, zx, H);
    else drawText(ctx, item.frontTxt, zx, 0, zw, H);
  } else {
    await loadFont(item.backTxt);
    drawText(ctx, item.backTxt, zx, 0, zw, H);
  }
  return cv;
}

export const canvasBlob = (cv, name) =>
  new Promise((res) => cv.toBlob((b) => res(new File([b], name, { type: "image/png" })), "image/png"));
