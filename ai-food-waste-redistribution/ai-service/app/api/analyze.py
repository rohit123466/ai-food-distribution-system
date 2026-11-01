from fastapi import APIRouter, File, HTTPException, UploadFile

from app.inference.freshness import InvalidImageError, score_freshness

router = APIRouter()

MAX_IMAGE_BYTES = 5 * 1024 * 1024


@router.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="image is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="image must be 5 MB or smaller")

    try:
        result = score_freshness(data)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Food recognition (labels) arrives with the trained recognition model; the
    # key is returned now so the server's storage format doesn't change later.
    return {**result, "labels": []}
