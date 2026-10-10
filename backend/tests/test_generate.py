import io
import json
import os
import zipfile

import pytest
import requests
from PIL import Image
from pypdf import PdfReader

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1]
                break
BASE_URL = BASE_URL.rstrip("/")
URL = f"{BASE_URL}/api/generate"


def _img_bytes(color=(255, 0, 0), size=(400, 300), fmt="PNG"):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, fmt)
    buf.seek(0)
    return buf


def _params(**overrides):
    p = dict(
        sheet="A4", orientation="portrait", width=8.5, height=5.5, copies=0,
        margin_top=1, margin_bottom=1, margin_left=1, margin_right=1, gap=0,
        fit="cover", cut_marks=True, flip="long", format="pdf", dpi=300,
    )
    p.update(overrides)
    return p


def _post(params, front=None, back=None):
    files = {"front": ("front.png", front or _img_bytes(), "image/png")}
    if back is not None:
        files["back"] = ("back.png", back, "image/png")
    data = {"params": json.dumps(params)}
    return requests.post(URL, data=data, files=files, timeout=60)


# --- Root health ---
def test_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=10)
    assert r.status_code == 200
    assert r.json()["message"]


# --- PDF generation ---
def test_pdf_single_page():
    r = _post(_params())
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "stampa.pdf" in r.headers.get("content-disposition", "")
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 1


def test_pdf_duplex_two_pages():
    r = _post(_params(), back=_img_bytes(color=(0, 0, 255)))
    assert r.status_code == 200
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 2


# --- Raster PNG/JPG ---
def test_png_size_a4_300dpi():
    r = _post(_params(format="png", dpi=300))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/png")
    img = Image.open(io.BytesIO(r.content))
    # A4 portrait 300dpi -> approx 2480 x 3508
    assert abs(img.size[0] - 2480) <= 2
    assert abs(img.size[1] - 3508) <= 2


def test_landscape_swaps_dims():
    r = _post(_params(format="png", orientation="landscape", dpi=150))
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    # landscape: W>H
    assert img.size[0] > img.size[1]


def test_jpg_single():
    r = _post(_params(format="jpg", dpi=150))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg")


# --- Duplex raster = ZIP ---
def test_duplex_raster_zip():
    r = _post(_params(format="png", dpi=150), back=_img_bytes(color=(0, 255, 0)))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        names = z.namelist()
        assert "fronte.png" in names and "retro.png" in names


# --- Error cases ---
def test_image_too_big_400():
    # Image 25x25 cm cannot fit on A4 (21x29.7) with margins
    r = _post(_params(width=25, height=25))
    assert r.status_code == 400
    assert "entra" in r.json()["detail"].lower() or "foglio" in r.json()["detail"].lower()


def test_bad_params_422():
    files = {"front": ("f.png", _img_bytes(), "image/png")}
    r = requests.post(URL, data={"params": json.dumps({"sheet": "A4", "width": -1, "height": 5})}, files=files, timeout=30)
    assert r.status_code == 422


def test_invalid_sheet_422():
    r = _post(_params(sheet="B4"))
    assert r.status_code == 422


# --- Copies limiting ---
def test_copies_limit():
    # width 8.5 height 5.5 A4 with 1cm margins: cols=floor(19/8.5)=2, rows=floor(27.7/5.5)=5, cap=10
    r = _post(_params(copies=3, format="png", dpi=72))
    assert r.status_code == 200
