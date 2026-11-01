"""Freshness scoring for a donation photo.

Two backends, picked at first use:

1. A trained Keras model at FRESHNESS_MODEL_PATH (a single sigmoid output =
   probability the food is fresh, 224x224 RGB input scaled to 0-1). Used
   whenever the file exists and TensorFlow is importable.
2. Otherwise a colour-statistics heuristic ("heuristic-v1"). It is NOT a
   trained model: it looks for the two visual signs of spoilage that survive
   most lighting — desaturated grey/green/blue fuzz (mould) and large near-black
   regions (rot, charring) — and reports a deliberately modest confidence so
   the server and the UI can tell the two backends apart.
"""

import io
import os
from functools import lru_cache

import numpy as np
from PIL import Image, UnidentifiedImageError

HEURISTIC_CONFIDENCE = 0.6
UNCLEAR_PHOTO_CONFIDENCE = 0.3


class InvalidImageError(ValueError):
    pass


def _load_rgb(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("file is not a readable image") from exc
    return image.convert("RGB")


@lru_cache(maxsize=1)
def _load_model():
    path = os.getenv("FRESHNESS_MODEL_PATH", "app/models/freshness.h5")
    if not os.path.exists(path):
        return None
    try:
        import tensorflow as tf  # imported lazily: the heuristic must work without TF installed
    except ImportError:
        return None
    return tf.keras.models.load_model(path)


def _score_with_model(model, image: Image.Image) -> dict:
    batch = np.asarray(image.resize((224, 224)), dtype=np.float32)[np.newaxis] / 255.0
    prob_fresh = float(model.predict(batch, verbose=0)[0][0])
    return {
        "freshness_score": round(prob_fresh * 100, 1),
        # Distance from the 50/50 boundary, rescaled to 0-1.
        "confidence": round(abs(prob_fresh - 0.5) * 2, 4),
        "model": "keras-freshness",
        "signals": {"prob_fresh": round(prob_fresh, 4)},
        "warnings": [],
    }


def _score_with_heuristic(image: Image.Image) -> dict:
    small = image.copy()
    small.thumbnail((128, 128))
    hsv = np.asarray(small.convert("HSV"), dtype=np.float32)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]  # PIL scales all three to 0-255

    # Mould: washed-out (low saturation), mid-to-bright, hue between yellow-green
    # and blue. Fresh greens like spinach or coriander are strongly saturated, so
    # the saturation cap is what keeps them from counting.
    mould = (sat < 60) & (val > 90) & (val < 230) & (hue > 40) & (hue < 170)
    dark = val < 45

    mould_ratio = float(mould.mean())
    dark_ratio = float(dark.mean())
    contrast = float(val.std())

    score = 100 - 120 * mould_ratio - 80 * dark_ratio
    score = max(0.0, min(100.0, score))

    warnings = []
    confidence = HEURISTIC_CONFIDENCE
    if contrast < 12 or min(image.size) < 64:
        warnings.append("Photo is too small or nearly uniform; retake it closer to the food in good light.")
        confidence = UNCLEAR_PHOTO_CONFIDENCE

    return {
        "freshness_score": round(score, 1),
        "confidence": confidence,
        "model": "heuristic-v1",
        "signals": {
            "mould_ratio": round(mould_ratio, 4),
            "dark_ratio": round(dark_ratio, 4),
            "contrast": round(contrast, 2),
        },
        "warnings": warnings,
    }


def score_freshness(image_bytes: bytes) -> dict:
    image = _load_rgb(image_bytes)
    model = _load_model()
    if model is not None:
        return _score_with_model(model, image)
    return _score_with_heuristic(image)
