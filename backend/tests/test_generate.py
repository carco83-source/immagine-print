"""Backend tests for /api/generate (multi-image items API)."""
import io
import json
import os
import zipfile

import pytest
import requests
from PIL import Image, ImageDraw
from pypdf import PdfReader

def _read_env():
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL missing")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", _read_env()).rstrip("/")
URL = f"{BASE_URL}/api/generate"


def png_bytes(color="red", size=(400, 300)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


def post(params, files=None, extra=None):
    data = {"params": json.dumps(params)}
    if extra:
        data.update(extra)
    return requests.post(URL, data=data, files=files or {}, timeout=60)


def default_params(**over):
    p = {
        "sheet": "A4", "orientation": "portrait",
        "items": [{"width": 8.5, "height": 5.5, "copies": 2}],
        "duplex": False, "width": 8.5, "height": 5.5,
        "margin_top": 1, "margin_bottom": 1, "margin_left": 1, "margin_right": 1,
        "gap": 0, "fit": "cover", "cut_marks": True, "flip": "long",
        "format": "pdf", "dpi": 150,
    }
    p.update(over)
    return p


# ---------- Health ----------
def test_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=10)
    assert r.status_code == 200
    assert r.json()["message"]


# ---------- PDF single item ----------
def test_pdf_single_item():
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(default_params(), files=files)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 1


# ---------- PDF multiple items same sheet (shelf pack) ----------
def test_pdf_multi_items_single_sheet():
    params = default_params(items=[
        {"width": 8.5, "height": 5.5, "copies": 2},
        {"width": 5.0, "height": 5.0, "copies": 2},
    ])
    files = {
        "front_0": ("a.png", png_bytes("red"), "image/png"),
        "front_1": ("b.png", png_bytes("blue"), "image/png"),
    }
    r = post(params, files=files)
    assert r.status_code == 200, r.text
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) >= 1


# ---------- Overflow produces additional sheets ----------
def test_overflow_creates_additional_sheets_pdf():
    # 10x10 cm on A4 (printable 19x27.7): 1 col, 2 rows -> 2 per sheet -> 10 sheets for 20
    params = default_params(items=[{"width": 10, "height": 10, "copies": 20}])
    files = {"front_0": ("a.png", png_bytes("green"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 200, r.text
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 10


# ---------- Duplex PDF: pages = sheets * 2 ----------
def test_duplex_pdf_pages_double():
    params = default_params(duplex=True, width=8.5, height=5.5,
                            items=[{"width": 8.5, "height": 5.5, "copies": 3}])
    files = {
        "front_0": ("a.png", png_bytes("red"), "image/png"),
        "back_0": ("b.png", png_bytes("blue"), "image/png"),
    }
    r = post(params, files=files)
    assert r.status_code == 200, r.text
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 2  # 1 sheet x 2


# ---------- PNG single file (1 sheet, no duplex) ----------
def test_png_single_sheet_returns_image():
    params = default_params(format="png")
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "image/png"
    img = Image.open(io.BytesIO(r.content))
    assert img.format == "PNG"


# ---------- PNG multi-sheet returns ZIP with foglioN_fronte naming ----------
def test_png_multi_sheet_zip():
    params = default_params(format="png", items=[{"width": 10, "height": 10, "copies": 8}])
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/zip"
    z = zipfile.ZipFile(io.BytesIO(r.content))
    names = z.namelist()
    assert any(n.startswith("foglio1_fronte") for n in names)
    assert any(n.startswith("foglio2_fronte") for n in names)


# ---------- Duplex PNG ZIP: fronte + retro per sheet ----------
def test_duplex_png_zip_names():
    params = default_params(format="png", duplex=True,
                            items=[{"width": 8.5, "height": 5.5, "copies": 2}])
    files = {
        "front_0": ("a.png", png_bytes("red"), "image/png"),
        "back_0": ("b.png", png_bytes("blue"), "image/png"),
    }
    r = post(params, files=files)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/zip"
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    # single sheet duplex -> no "foglioN_" prefix per rules (len(pages)==1)
    assert "fronte.png" in names
    assert "retro.png" in names


# ---------- JPG format ----------
def test_jpg_single_sheet():
    params = default_params(format="jpg")
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"


# ---------- 400 when front missing ----------
def test_missing_front_returns_400():
    params = default_params(items=[
        {"width": 8.5, "height": 5.5, "copies": 1},
        {"width": 5.0, "height": 5.0, "copies": 1},
    ])
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    # front_1 missing
    r = post(params, files=files)
    assert r.status_code == 400
    assert "fronte" in r.json()["detail"].lower()


# ---------- 400 when nothing fits ----------
def test_nothing_fits_returns_400():
    # 50x50 cm on A4 - too big
    params = default_params(items=[{"width": 50, "height": 50, "copies": 1}])
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 400


# ---------- 422 invalid params ----------
def test_invalid_sheet_422():
    params = default_params(sheet="XX")
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 422


def test_zero_copies_422():
    params = default_params(items=[{"width": 8.5, "height": 5.5, "copies": 0}])
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 422


def test_empty_items_422():
    params = default_params(items=[])
    r = post(params, files={})
    assert r.status_code == 422


# ---------- Landscape swaps dimensions ----------
def test_landscape_png_dimensions():
    params = default_params(format="png", orientation="landscape", dpi=150)
    files = {"front_0": ("a.png", png_bytes("red"), "image/png")}
    r = post(params, files=files)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    # A4 landscape at 150 dpi -> 29.7cm * 150/2.54 ~ 1754, 21*150/2.54 ~ 1240
    assert img.width > img.height
