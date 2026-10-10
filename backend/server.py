from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Literal
from PIL import Image, ImageOps, ImageDraw
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import cm
import io
import math
import zipfile
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")

SHEETS = {"A4": (21.0, 29.7), "A3": (29.7, 42.0), "32x45": (32.0, 45.0), "A5": (14.8, 21.0)}
MARK_OFFSET = 0.2
MARK_LEN = 0.5


class Params(BaseModel):
    sheet: Literal["A4", "A3", "32x45", "A5"] = "A4"
    orientation: Literal["portrait", "landscape"] = "portrait"
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    copies: int = Field(ge=0, default=0)
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


def compute_layout(p: Params):
    W, H = SHEETS[p.sheet]
    if p.orientation == "landscape":
        W, H = H, W
    aw = W - p.margin_left - p.margin_right
    ah = H - p.margin_top - p.margin_bottom
    cols = max(0, math.floor((aw + p.gap + 1e-9) / (p.width + p.gap)))
    rows = max(0, math.floor((ah + p.gap + 1e-9) / (p.height + p.gap)))
    cap = cols * rows
    n = cap if p.copies == 0 else min(p.copies, cap)
    used_cols = min(n, cols)
    used_rows = math.ceil(n / cols) if cols else 0
    bw = used_cols * p.width + max(0, used_cols - 1) * p.gap
    bh = used_rows * p.height + max(0, used_rows - 1) * p.gap
    x0 = p.margin_left + (aw - bw) / 2
    y0 = p.margin_top + (ah - bh) / 2
    pos = [(x0 + (i % cols) * (p.width + p.gap), y0 + (i // cols) * (p.height + p.gap)) for i in range(n)]
    return dict(W=W, H=H, pos=pos, x0=x0, y0=y0, bw=bw, bh=bh, used_cols=used_cols, used_rows=used_rows)


def back_positions(lay, p: Params):
    if p.flip == "long":
        return [(lay["W"] - x - p.width, y) for x, y in lay["pos"]]
    return [(x, lay["H"] - y - p.height) for x, y in lay["pos"]]


def cut_lines(lay, p: Params):
    xs, ys = set(), set()
    for c in range(lay["used_cols"]):
        x = lay["x0"] + c * (p.width + p.gap)
        xs.update([round(x, 4), round(x + p.width, 4)])
    for r in range(lay["used_rows"]):
        y = lay["y0"] + r * (p.height + p.gap)
        ys.update([round(y, 4), round(y + p.height, 4)])
    top, bottom = lay["y0"], lay["y0"] + lay["bh"]
    left, right = lay["x0"], lay["x0"] + lay["bw"]
    lines = []
    for x in xs:
        lines.append((x, top - MARK_OFFSET - MARK_LEN, x, top - MARK_OFFSET))
        lines.append((x, bottom + MARK_OFFSET, x, bottom + MARK_OFFSET + MARK_LEN))
    for y in ys:
        lines.append((left - MARK_OFFSET - MARK_LEN, y, left - MARK_OFFSET, y))
        lines.append((right + MARK_OFFSET, y, right + MARK_OFFSET + MARK_LEN, y))
    return lines


def prepare_tile(img: Image.Image, p: Params, dpi: int, rotate: bool):
    size = (max(1, round(p.width / 2.54 * dpi)), max(1, round(p.height / 2.54 * dpi)))
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


def render_pdf(lay, p, front, back):
    buf = io.BytesIO()
    W, H = lay["W"], lay["H"]
    c = rl_canvas.Canvas(buf, pagesize=(W * cm, H * cm))
    c.setTitle("Impaginazione stampa")
    pages = [(front, lay["pos"], p.cut_marks, False)]
    if back is not None:
        pages.append((back, back_positions(lay, p), False, p.flip == "short"))
    for img, positions, marks, rotate in pages:
        reader = ImageReader(prepare_tile(img, p, p.dpi, rotate))
        for x, y in positions:
            c.drawImage(reader, x * cm, (H - y - p.height) * cm, p.width * cm, p.height * cm)
        if marks:
            c.setLineWidth(0.25)
            c.setStrokeColorRGB(0, 0, 0)
            for x1, y1, x2, y2 in cut_lines(lay, p):
                c.line(x1 * cm, (H - y1) * cm, x2 * cm, (H - y2) * cm)
        c.showPage()
    c.save()
    return buf.getvalue()


def render_raster(lay, p, img, positions, marks, rotate):
    k = p.dpi / 2.54
    sheet = Image.new("RGB", (round(lay["W"] * k), round(lay["H"] * k)), "white")
    tile = prepare_tile(img, p, p.dpi, rotate)
    for x, y in positions:
        sheet.paste(tile, (round(x * k), round(y * k)))
    if marks:
        d = ImageDraw.Draw(sheet)
        lw = max(1, round(0.025 * k))
        for x1, y1, x2, y2 in cut_lines(lay, p):
            d.line([(x1 * k, y1 * k), (x2 * k, y2 * k)], fill="black", width=lw)
    out = io.BytesIO()
    if p.format == "jpg":
        sheet.save(out, "JPEG", quality=95, dpi=(p.dpi, p.dpi))
    else:
        sheet.save(out, "PNG", dpi=(p.dpi, p.dpi))
    return out.getvalue()


async def load_image(f: Optional[UploadFile]):
    if f is None:
        return None
    try:
        img = Image.open(io.BytesIO(await f.read()))
        img.load()
        return img
    except Exception:
        raise HTTPException(400, f"Immagine non valida: {f.filename}")


@api_router.get("/")
async def root():
    return {"message": "Impaginazione API"}


@api_router.post("/generate")
async def generate(params: str = Form(...), front: UploadFile = File(...), back: Optional[UploadFile] = File(None)):
    try:
        p = Params.model_validate_json(params)
    except Exception as e:
        raise HTTPException(422, f"Parametri non validi: {e}")
    lay = compute_layout(p)
    if not lay["pos"]:
        raise HTTPException(400, "L'immagine non entra nel foglio con i margini indicati")
    front_img = await load_image(front)
    back_img = await load_image(back)

    if p.format == "pdf":
        data = render_pdf(lay, p, front_img, back_img)
        return Response(data, media_type="application/pdf",
                        headers={"Content-Disposition": 'attachment; filename="stampa.pdf"'})

    ext = p.format
    front_bytes = render_raster(lay, p, front_img, lay["pos"], p.cut_marks, False)
    if back_img is None:
        mt = "image/jpeg" if ext == "jpg" else "image/png"
        return Response(front_bytes, media_type=mt,
                        headers={"Content-Disposition": f'attachment; filename="fronte.{ext}"'})
    back_bytes = render_raster(lay, p, back_img, back_positions(lay, p), False, p.flip == "short")
    zbuf = io.BytesIO()
    with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"fronte.{ext}", front_bytes)
        z.writestr(f"retro.{ext}", back_bytes)
    return Response(zbuf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="stampa_fronte_retro.zip"'})


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
