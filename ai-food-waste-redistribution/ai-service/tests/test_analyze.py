import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _png(pixels: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(pixels.astype(np.uint8), "RGB").save(buf, format="PNG")
    return buf.getvalue()


def _post(image_bytes: bytes):
    return client.post("/analyze", files={"image": ("food.png", image_bytes, "image/png")})


def test_colourful_food_photo_scores_fresh():
    rng = np.random.default_rng(0)
    # Saturated oranges/yellows/greens with texture, like a plate of curry and rice.
    pixels = np.zeros((200, 200, 3))
    pixels[..., 0] = rng.integers(180, 250, (200, 200))
    pixels[..., 1] = rng.integers(90, 200, (200, 200))
    pixels[..., 2] = rng.integers(10, 60, (200, 200))
    res = _post(_png(pixels))
    assert res.status_code == 200
    body = res.json()
    assert body["model"] == "heuristic-v1"
    assert body["freshness_score"] >= 70
    assert body["labels"] == []


def test_mouldy_grey_green_photo_scores_spoiled():
    rng = np.random.default_rng(1)
    # Washed-out grey-green fuzz covering most of the frame.
    base = rng.integers(140, 190, (200, 200))
    pixels = np.stack([base - 15, base + 5, base - 5], axis=-1)
    res = _post(_png(pixels))
    assert res.status_code == 200
    assert res.json()["freshness_score"] < 70


def test_uniform_photo_is_flagged_unclear():
    res = _post(_png(np.full((200, 200, 3), 200)))
    body = res.json()
    assert body["confidence"] == 0.3
    assert body["warnings"]


def test_non_image_upload_is_rejected():
    res = client.post("/analyze", files={"image": ("notes.txt", b"not an image", "text/plain")})
    assert res.status_code == 400
