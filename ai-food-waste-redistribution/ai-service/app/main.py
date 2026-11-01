from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

from app.api.analyze import router as analyze_router  # noqa: E402 — needs env loaded first
from app.api.health import router as health_router  # noqa: E402

app = FastAPI(title="AI Food Waste Redistribution — AI Service")

app.include_router(health_router)
app.include_router(analyze_router)
