export const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ file, url, w: img.naturalWidth, h: img.naturalHeight, el: img });
    img.onerror = reject;
    img.src = url;
  });

// Crops uniform borders (colour of the top-left pixel) around the subject.
export async function trimImage(image, tol = 28) {
  const { el, w, h } = image;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.drawImage(el, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  const [r0, g0, b0, a0] = [d[0], d[1], d[2], d[3]];
  const diff = (i) =>
    Math.max(Math.abs(d[i] - r0), Math.abs(d[i + 1] - g0), Math.abs(d[i + 2] - b0), Math.abs(d[i + 3] - a0)) > tol;
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (diff((y * w + x) * 4)) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < 0) return null;
  const cw = right - left + 1;
  const ch = bottom - top + 1;
  if (cw === w && ch === h) return null;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d").drawImage(cv, left, top, cw, ch, 0, 0, cw, ch);
  const blob = await new Promise((res) => out.toBlob(res, "image/png"));
  const file = new File([blob], `rifilata_${image.file.name.replace(/\.\w+$/, "")}.png`, { type: "image/png" });
  return loadImage(file);
}

const pixels = (image) => {
  const cv = document.createElement("canvas");
  cv.width = image.w;
  cv.height = image.h;
  const ctx = cv.getContext("2d");
  ctx.drawImage(image.el, 0, 0);
  return { cv, ctx, data: ctx.getImageData(0, 0, image.w, image.h) };
};

const isBgLike = (d, i) => d[i + 3] < 128 || (d[i] > 165 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 20);

// Detects a fake "transparent" checkerboard (light grey/white squares) or real transparency on the border.
export function hasCheckerboard(image) {
  const { data } = pixels(image);
  const d = data.data, w = image.w, h = image.h;
  let bg = 0, total = 0, transparent = 0;
  const levels = {};
  const sample = (x, y) => {
    const i = (y * w + x) * 4;
    total++;
    if (d[i + 3] < 128) { transparent++; bg++; return; }
    if (isBgLike(d, i)) { bg++; const k = Math.round(d[i] / 16); levels[k] = (levels[k] || 0) + 1; }
  };
  for (let x = 0; x < w; x += 2) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y += 2) { sample(0, y); sample(w - 1, y); }
  const strong = Object.values(levels).filter((c) => c > total * 0.12).length;
  return transparent > total * 0.3 || (bg > total * 0.6 && strong >= 2);
}

// Flood-fills from the borders, turning checkerboard / transparent pixels into solid white.
export async function removeCheckerboard(image) {
  const { cv, ctx, data } = pixels(image);
  const d = data.data, w = image.w, h = image.h;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const p = y * w + x;
    if (!seen[p] && isBgLike(d, p * 4)) { seen[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  let changed = 0;
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255;
    changed++;
    const x = p % w, y = (p - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i] / 255;
    if (a < 1) { d[i - 3] = d[i - 3] * a + 255 * (1 - a); d[i - 2] = d[i - 2] * a + 255 * (1 - a); d[i - 1] = d[i - 1] * a + 255 * (1 - a); d[i] = 255; }
  }
  if (!changed) return null;
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
  const file = new File([blob], `sfondo_${image.file.name.replace(/\.\w+$/, "")}.png`, { type: "image/png" });
  return loadImage(file);
}

export async function loadForPrint(file) {
  const img = await loadImage(file);
  if (!hasCheckerboard(img)) return img;
  const clean = await removeCheckerboard(img);
  return clean ? { ...clean, prev: img, op: "bg" } : img;
}
