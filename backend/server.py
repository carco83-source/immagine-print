from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Literal
from PIL import Image, ImageOps, ImageDraw
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import cm
import io
from functools import lru_cache
import zipfile
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")

SHEETS = {"A4": (21.0, 29.7), "A3": (29.7, 42.0), "32x45": (32.0, 45.0), "A5": (14.8, 21.0)}
MARK_OFFSET = 0.2
MARK_LEN = 0.5
EPS = 1e-6


class Item(BaseModel):
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    copies: int = Field(ge=1, le=1000)
    fit: Literal["cover", "contain", "stretch"] = "cover"
    shape: Literal["rect", "round"] = "rect"
    outline: bool = True
    hires: bool = False


class Params(BaseModel):
    sheet: Literal["A4", "A3", "32x45", "A5"] = "A4"
    orientation: Literal["portrait", "landscape"] = "portrait"
    items: List[Item] = Field(min_length=1)
    duplex: bool = False
    width: float = Field(gt=0, default=8.5)
    height: float = Field(gt=0, default=5.5)
    margin_top: float = Field(ge=0, default=1)
    margin_bottom: float = Field(ge=0, default=1)
    margin_left: float = Field(ge=0, default=1)
    margin_right: float = Field(ge=0, default=1)
    gap: float = Field(ge=0, default=0)
    cut_marks: bool = True
    flip: Literal["long", "short"] = "long"
    format: Literal["pdf", "png", "jpg"] = "pdf"
    dpi: int = Field(ge=72, le=600, default=300)


def tile_size(it: Item, p: Params):
    return (it.width, it.height)


def compute_pages(p: Params):
    W, H = SHEETS[p.sheet]
    if p.orientation == "landscape":
        W, H = H, W
    aw = W - p.margin_left - p.margin_right
    ah = H - p.margin_top - p.margin_bottom
    pages, cur, x, y, row_h, unfit = [], [], 0.0, 0.0, 0.0, 0
    for idx, it in enumerate(p.items):
        w, h = tile_size(it, p)
        if w > aw + EPS or h > ah + EPS:
            unfit += it.copies
            continue
        for _ in range(it.copies):
            if x > 0 and x + w > aw + EPS:
                y += row_h + p.gap
                x, row_h = 0.0, 0.0
            if y + h > ah + EPS:
                pages.append(cur)
                cur, x, y, row_h = [], 0.0, 0.0, 0.0
            cur.append(dict(idx=idx, x=x, y=y, w=w, h=h))
            x += w + p.gap
            row_h = max(row_h, h)
    if cur:
        pages.append(cur)
    for page in pages:
        ox = p.margin_left + (aw - max(t["x"] + t["w"] for t in page)) / 2
        oy = p.margin_top + (ah - max(t["y"] + t["h"] for t in page)) / 2
        for t in page:
            t["x"] += ox
            t["y"] += oy
    return W, H, pages, unfit


def back_tiles(page, W, H, p: Params):
    if p.flip == "long":
        return [{**t, "x": W - t["x"] - t["w"]} for t in page]
    return [{**t, "y": H - t["y"] - t["h"]} for t in page]


def _hits(seg, tiles):
    x1, y1, x2, y2 = seg
    for t in tiles:
        if x1 == x2:
            if t["x"] - EPS <= x1 <= t["x"] + t["w"] + EPS and min(y1, y2) < t["y"] + t["h"] - EPS and max(y1, y2) > t["y"] + EPS:
                return True
        elif t["y"] - EPS <= y1 <= t["y"] + t["h"] + EPS and min(x1, x2) < t["x"] + t["w"] - EPS and max(x1, x2) > t["x"] + EPS:
            return True
    return False


def cut_lines(page):
    o, ln = MARK_OFFSET, MARK_LEN
    segs = set()
    for t in page:
        for x in (t["x"], t["x"] + t["w"]):
            segs.add((x, t["y"] - o - ln, x, t["y"] - o))
            segs.add((x, t["y"] + t["h"] + o, x, t["y"] + t["h"] + o + ln))
        for y in (t["y"], t["y"] + t["h"]):
            segs.add((t["x"] - o - ln, y, t["x"] - o, y))
            segs.add((t["x"] + t["w"] + o, y, t["x"] + t["w"] + o + ln, y))
    return [tuple(round(v, 4) for v in s) for s in segs if not _hits(s, page)]


CROSS = 0.2


def inner_crosses(page):
    o, ln = MARK_OFFSET, MARK_LEN
    pts = set()
    for t in page:
        for x, sx in ((t["x"], -1), (t["x"] + t["w"], 1)):
            for y, sy in ((t["y"], -1), (t["y"] + t["h"], 1)):
                v = (x, y + sy * o, x, y + sy * (o + ln))
                h = (x + sx * o, y, x + sx * (o + ln), y)
                if _hits(v, page) or _hits(h, page):
                    pts.add((round(x, 4), round(y, 4)))
    return [(x - CROSS, y, x + CROSS, y) for x, y in pts] + [(x, y - CROSS, x, y + CROSS) for x, y in pts]


def flatten(img: Image.Image):
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.split()[3])
        return bg
    return img.convert("RGB")


def prepare_tile(img: Image.Image, w_cm, h_cm, fit, p: Params, rotate: bool, dpi: int):
    size = (max(1, round(w_cm / 2.54 * dpi)), max(1, round(h_cm / 2.54 * dpi)))
    img = flatten(img)
    if fit == "cover":
        tile = ImageOps.fit(img, size, Image.LANCZOS)
    elif fit == "stretch":
        tile = img.resize(size, Image.LANCZOS)
    else:
        inner = ImageOps.contain(img, size, Image.LANCZOS)
        tile = Image.new("RGB", size, "white")
        tile.paste(inner, ((size[0] - inner.width) // 2, (size[1] - inner.height) // 2))
    return tile.rotate(180) if rotate else tile


class TileCache:
    def __init__(self, p):
        self.p, self.cache = p, {}

    def get(self, img, t, rotate):
        fit = self.p.items[t["idx"]].fit
        key = (id(img), t["w"], t["h"], fit, rotate)
        if key not in self.cache:
            hires = self.p.items[t["idx"]].hires and self.p.format == "pdf"
            dpi = max(self.p.dpi, 600) if hires else self.p.dpi
            self.cache[key] = prepare_tile(img, t["w"], t["h"], fit, self.p, rotate, dpi)
        return self.cache[key]


def sides(p, W, H, pages, fronts, backs):
    rotate_back = p.flip == "short"
    for page in pages:
        yield page, fronts, p.cut_marks, False, True
        if p.duplex:
            yield back_tiles(page, W, H, p), backs, False, rotate_back, False


def render_pdf(p, W, H, pages, fronts, backs):
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(W * cm, H * cm))
    c.setTitle("Impaginazione stampa")
    cache, readers = TileCache(p), {}
    for tiles, imgs, marks, rotate, front in sides(p, W, H, pages, fronts, backs):
        for t in tiles:
            img = imgs[t["idx"]]
            if img is None:
                continue
            key = (id(img), t["w"], t["h"], p.items[t["idx"]].fit, rotate)
            if key not in readers:
                readers[key] = ImageReader(cache.get(img, t, rotate))
            x, y, w, h = t["x"] * cm, (H - t["y"] - t["h"]) * cm, t["w"] * cm, t["h"] * cm
            round_ = p.items[t["idx"]].shape == "round"
            if round_:
                c.saveState()
                path = c.beginPath()
                path.ellipse(x, y, w, h)
                c.clipPath(path, stroke=0, fill=0)
            c.drawImage(readers[key], x, y, w, h)
            if round_:
                c.restoreState()
        if front:
            c.setLineWidth(0.4)
            for t in outlined(p, tiles):
                c.ellipse(t["x"] * cm, (H - t["y"] - t["h"]) * cm, (t["x"] + t["w"]) * cm, (H - t["y"]) * cm, stroke=1, fill=0)
        if marks:
            c.setLineWidth(0.25)
            for x1, y1, x2, y2 in cut_lines(tiles):
                c.line(x1 * cm, (H - y1) * cm, x2 * cm, (H - y2) * cm)
            for color, lw in ((1, 0.9), (0, 0.3)):
                c.setStrokeGray(color)
                c.setLineWidth(lw)
                for x1, y1, x2, y2 in inner_crosses(tiles):
                    c.line(x1 * cm, (H - y1) * cm, x2 * cm, (H - y2) * cm)
            c.setStrokeGray(0)
        c.showPage()
    c.save()
    return buf.getvalue()


@lru_cache(maxsize=32)
def ellipse_mask(size):
    big = Image.new("L", (size[0] * 4, size[1] * 4), 0)
    ImageDraw.Draw(big).ellipse([0, 0, big.width - 1, big.height - 1], fill=255)
    return big.resize(size, Image.LANCZOS)


def outlined(p, tiles):
    return [t for t in tiles if p.items[t["idx"]].shape == "round" and p.items[t["idx"]].outline]


def render_raster(p, W, H, tiles, imgs, marks, rotate, cache, front):
    k = p.dpi / 2.54
    sheet = Image.new("RGB", (round(W * k), round(H * k)), "white")
    for t in tiles:
        img = imgs[t["idx"]]
        if img is not None:
            tile = cache.get(img, t, rotate)
            span = (round((t["x"] + t["w"]) * k) - round(t["x"] * k), round((t["y"] + t["h"]) * k) - round(t["y"] * k))
            if tile.size != span:
                tile = tile.resize(span, Image.LANCZOS)
            mask = None
            if p.items[t["idx"]].shape == "round":
                mask = ellipse_mask(tile.size)
            sheet.paste(tile, (round(t["x"] * k), round(t["y"] * k)), mask)
    if front:
        d = ImageDraw.Draw(sheet)
        lw = max(1, round(0.015 * k))
        for t in outlined(p, tiles):
            d.ellipse([t["x"] * k, t["y"] * k, (t["x"] + t["w"]) * k - 1, (t["y"] + t["h"]) * k - 1], outline="black", width=lw)
    if marks:
        d = ImageDraw.Draw(sheet)
        lw = max(1, round(0.025 * k))
        for x1, y1, x2, y2 in cut_lines(tiles):
            d.line([(x1 * k, y1 * k), (x2 * k, y2 * k)], fill="black", width=lw)
        for color, w in (("white", lw * 3), ("black", lw)):
            for x1, y1, x2, y2 in inner_crosses(tiles):
                d.line([(x1 * k, y1 * k), (x2 * k, y2 * k)], fill=color, width=w)
    out = io.BytesIO()
    if p.format == "jpg":
        sheet.save(out, "JPEG", quality=95, dpi=(p.dpi, p.dpi))
    else:
        sheet.save(out, "PNG", dpi=(p.dpi, p.dpi))
    return out.getvalue()


async def load_image(upload):
    if upload is None or isinstance(upload, str):
        return None
    try:
        img = Image.open(io.BytesIO(await upload.read()))
        img.load()
        return img
    except Exception:
        raise HTTPException(400, f"Immagine non valida: {upload.filename}")


@api_router.get("/")
async def root():
    return {"message": "Impaginazione API"}


@api_router.post("/generate")
async def generate(request: Request):
    form = await request.form()
    try:
        p = Params.model_validate_json(form.get("params") or "")
    except Exception as e:
        raise HTTPException(422, f"Parametri non validi: {e}")
    fronts = [await load_image(form.get(f"front_{i}")) for i in range(len(p.items))]
    if any(f is None for f in fronts):
        raise HTTPException(400, "Manca l'immagine del fronte per uno o più elementi")
    backs = [await load_image(form.get(f"back_{i}")) for i in range(len(p.items))] if p.duplex else []
    W, H, pages, unfit = compute_pages(p)
    if not pages:
        raise HTTPException(400, "Nessuna immagine entra nel foglio con i margini indicati")

    if p.format == "pdf":
        return Response(render_pdf(p, W, H, pages, fronts, backs), media_type="application/pdf",
                        headers={"Content-Disposition": 'attachment; filename="stampa.pdf"'})

    ext, cache = p.format, TileCache(p)
    files = []
    for n, page in enumerate(pages, 1):
        prefix = f"foglio{n}_" if len(pages) > 1 else ""
        files.append((f"{prefix}fronte.{ext}", render_raster(p, W, H, page, fronts, p.cut_marks, False, cache, True)))
        if p.duplex:
            files.append((f"{prefix}retro.{ext}",
                          render_raster(p, W, H, back_tiles(page, W, H, p), backs, False, p.flip == "short", cache, False)))
    if len(files) == 1:
        mt = "image/jpeg" if ext == "jpg" else "image/png"
        return Response(files[0][1], media_type=mt,
                        headers={"Content-Disposition": f'attachment; filename="{files[0][0]}"'})
    zbuf = io.BytesIO()
    with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in files:
            z.writestr(name, data)
    return Response(zbuf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="stampa.zip"'})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

logging.basicConfig(level=logging.INFO)
