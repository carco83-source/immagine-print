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
    fit: Literal["cover", "contain", "stretch"] = "cover"
    cut_marks: bool = True
    flip: Literal["long", "short"] = "long"
    format: Literal["pdf", "png", "jpg"] = "pdf"
    dpi: int = Field(ge=72, le=600, default=300)


def tile_size(it: Item, p: Params):
    return (p.width, p.height) if p.duplex else (it.width, it.height)


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


def prepare_tile(img: Image.Image, w_cm, h_cm, p: Params, rotate: bool):
    size = (max(1, round(w_cm / 2.54 * p.dpi)), max(1, round(h_cm / 2.54 * p.dpi)))
    img = ImageOps.exif_transpose(img).convert("RGB")
    if p.fit == "cover":
        tile = ImageOps.fit(img, size, Image.LANCZOS)
    elif p.fit == "stretch":
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
        key = (id(img), t["w"], t["h"], rotate)
        if key not in self.cache:
            self.cache[key] = prepare_tile(img, t["w"], t["h"], self.p, rotate)
        return self.cache[key]


def sides(p, W, H, pages, fronts, backs):
    rotate_back = p.flip == "short"
    for page in pages:
        yield page, fronts, p.cut_marks, False
        if p.duplex:
            yield back_tiles(page, W, H, p), backs, False, rotate_back


def render_pdf(p, W, H, pages, fronts, backs):
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(W * cm, H * cm))
    c.setTitle("Impaginazione stampa")
    cache, readers = TileCache(p), {}
    for tiles, imgs, marks, rotate in sides(p, W, H, pages, fronts, backs):
        for t in tiles:
            img = imgs[t["idx"]]
            if img is None:
                continue
            key = (id(img), t["w"], t["h"], rotate)
            if key not in readers:
                readers[key] = ImageReader(cache.get(img, t, rotate))
            c.drawImage(readers[key], t["x"] * cm, (H - t["y"] - t["h"]) * cm, t["w"] * cm, t["h"] * cm)
        if marks:
            c.setLineWidth(0.25)
            for x1, y1, x2, y2 in cut_lines(tiles):
                c.line(x1 * cm, (H - y1) * cm, x2 * cm, (H - y2) * cm)
        c.showPage()
    c.save()
    return buf.getvalue()


def render_raster(p, W, H, tiles, imgs, marks, rotate, cache):
    k = p.dpi / 2.54
    sheet = Image.new("RGB", (round(W * k), round(H * k)), "white")
    for t in tiles:
        img = imgs[t["idx"]]
        if img is not None:
            sheet.paste(cache.get(img, t, rotate), (round(t["x"] * k), round(t["y"] * k)))
    if marks:
        d = ImageDraw.Draw(sheet)
        lw = max(1, round(0.025 * k))
        for x1, y1, x2, y2 in cut_lines(tiles):
            d.line([(x1 * k, y1 * k), (x2 * k, y2 * k)], fill="black", width=lw)
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
        files.append((f"{prefix}fronte.{ext}", render_raster(p, W, H, page, fronts, p.cut_marks, False, cache)))
        if p.duplex:
            files.append((f"{prefix}retro.{ext}",
                          render_raster(p, W, H, back_tiles(page, W, H, p), backs, False, p.flip == "short", cache)))
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
