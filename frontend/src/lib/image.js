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
