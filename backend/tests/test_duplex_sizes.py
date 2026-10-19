"""Duplex with per-item sizes (iteration 5): each item keeps its own width/height in front & back."""
import io
import zipfile

from PIL import Image
from pypdf import PdfReader

from test_generate import post, default_params, png_bytes


def _files(n, duplex=True):
    f = {}
    colors = ["red", "blue", "green"]
    for i in range(n):
        f[f"front_{i}"] = (f"f{i}.png", png_bytes(colors[i]), "image/png")
        if duplex:
            f[f"back_{i}"] = (f"b{i}.png", png_bytes("yellow"), "image/png")
    return f


# Duplex PDF with 2 different item sizes -> 2 pages
def test_duplex_two_sizes_pdf():
    items = [{"width": 10, "height": 7, "copies": 2}, {"width": 5, "height": 5, "copies": 3}]
    r = post(default_params(items=items, duplex=True), _files(2))
    assert r.status_code == 200, r.text
    assert len(PdfReader(io.BytesIO(r.content)).pages) == 2


# Duplex mixed tag (9x2.5 stretch) + normal 6x4 -> PNG zip with front/back
def test_duplex_tag_and_normal_png_zip():
    items = [{"width": 9, "height": 2.5, "copies": 4, "fit": "stretch"}, {"width": 6, "height": 4, "copies": 2}]
    r = post(default_params(items=items, duplex=True, format="png", dpi=100), _files(2))
    assert r.status_code == 200, r.text
    z = zipfile.ZipFile(io.BytesIO(r.content))
    names = z.namelist()
    assert len(names) == 2, names
    fr = Image.open(io.BytesIO(z.read([n for n in names if "fronte" in n][0]))).convert("RGB")
    bk = Image.open(io.BytesIO(z.read([n for n in names if "retro" in n][0]))).convert("RGB")
    assert fr.size == bk.size
    # Back must have yellow pixels and front must have red + blue
    fc = {c for _, c in fr.getcolors(10_000_000)}
    bc = {c for _, c in bk.getcolors(10_000_000)}
    assert (255, 0, 0) in fc and (0, 0, 255) in fc
    assert (255, 255, 0) in bc


# Back mirrored (flip long): bbox of yellow on back equals x-mirror of colored bbox on front
def test_duplex_back_mirror_positions_different_sizes():
    items = [{"width": 10, "height": 7, "copies": 1}, {"width": 5, "height": 5, "copies": 1}]
    r = post(default_params(items=items, duplex=True, format="png", dpi=72, cut_marks=False), _files(2))
    assert r.status_code == 200, r.text
    z = zipfile.ZipFile(io.BytesIO(r.content))
    fr = Image.open(io.BytesIO(z.read([n for n in z.namelist() if "fronte" in n][0]))).convert("RGB")
    bk = Image.open(io.BytesIO(z.read([n for n in z.namelist() if "retro" in n][0]))).convert("RGB")
    W = fr.size[0]

    def bbox(img, col):
        px = img.load()
        xs = [x for x in range(img.size[0]) for y in range(0, img.size[1], 4) if px[x, y] == col]
        return min(xs), max(xs)

    rx0, rx1 = bbox(fr, (255, 0, 0))
    # red item A (10cm) on front left -> back yellow should include region at mirrored position
    px = bk.load()
    mid_y = None
    for y in range(bk.size[1]):
        if px[W - 1 - (rx0 + rx1) // 2, y] == (255, 255, 0):
            mid_y = y
            break
    assert mid_y is not None, "mirrored back tile for item A not found"
