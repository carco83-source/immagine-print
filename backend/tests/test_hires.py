"""Backend tests for Item.hires (bomboniera tags embedded at >=600dpi in PDF)."""
import io
import json

import requests
from PIL import Image
from pypdf import PdfReader

from test_generate import URL


def big_png(size=(2008, 1299)):
    # ~8.5x5.5cm @600dpi with noise-free gradient
    img = Image.new("RGB", size)
    img.putdata([((x * 7) % 256, (y * 3) % 256, 128) for y in range(size[1]) for x in range(size[0])])
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


IMG = big_png()


def params(hires, fmt="pdf", duplex=False):
    return {
        "sheet": "A4", "orientation": "portrait", "duplex": duplex,
        "items": [{"width": 8.5, "height": 5.5, "copies": 2, "fit": "stretch", "hires": hires}],
        "margin_top": 1, "margin_bottom": 1, "margin_left": 1, "margin_right": 1,
        "gap": 0, "cut_marks": True, "flip": "long", "format": fmt, "dpi": 150,
    }


def gen(hires, fmt="pdf", duplex=False):
    files = {"front_0": ("f.png", IMG, "image/png")}
    if duplex:
        files["back_0"] = ("b.png", IMG, "image/png")
    return requests.post(URL, data={"params": json.dumps(params(hires, fmt, duplex))}, files=files, timeout=120)


def embedded_sizes(pdf_bytes):
    r = PdfReader(io.BytesIO(pdf_bytes))
    out = []
    for pg in r.pages:
        for im in pg.images:
            out.append(im.image.size)
    return out, len(r.pages)


def test_hires_pdf_embeds_600dpi():
    r = gen(True)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    sizes, n = embedded_sizes(r.content)
    assert n == 1
    assert sizes and all(abs(w - 2008) <= 2 and abs(h - 1299) <= 2 for w, h in sizes), sizes


def test_non_hires_pdf_embeds_at_dpi():
    r = gen(False)
    assert r.status_code == 200
    sizes, _ = embedded_sizes(r.content)
    assert sizes and all(abs(w - 502) <= 2 and abs(h - 325) <= 2 for w, h in sizes), sizes


def test_hires_bigger_than_non_hires():
    a, _ = embedded_sizes(gen(True).content)
    b, _ = embedded_sizes(gen(False).content)
    assert a[0][0] > b[0][0] * 3


def test_hires_duplex_pdf():
    r = gen(True, duplex=True)
    assert r.status_code == 200
    sizes, n = embedded_sizes(r.content)
    assert n == 2
    assert all(w >= 2000 for w, _ in sizes)


def test_hires_ignored_for_png():
    r = gen(True, fmt="png")
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    # A4 @150dpi
    assert abs(img.size[0] - round(21 / 2.54 * 150)) <= 2


def test_hires_default_false():
    p = params(False)
    del p["items"][0]["hires"]
    r = requests.post(URL, data={"params": json.dumps(p)}, files={"front_0": ("f.png", IMG, "image/png")}, timeout=60)
    assert r.status_code == 200
