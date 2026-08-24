from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.utils.logger import get_logger
from app import models  # noqa: F401 ensures models are registered with Base

from app.routers import (
    auth, datasets, dashboard, ask, insights, forecasting,
    segmentation, anomaly, whatif, recommendations, reports,
    automation, history, sample,
)

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info(f"{settings.APP_NAME} starting up in '{settings.ENV}' mode.")
    if settings.ENABLE_SCHEDULER:
        from app.services.scheduler import start_scheduler
        start_scheduler()
    yield
    if settings.ENABLE_SCHEDULER:
        from app.services.scheduler import stop_scheduler
        stop_scheduler()
    logger.info("Shutting down.")


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})


@app.get("/")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(dashboard.router)
app.include_router(ask.router)
app.include_router(insights.router)
app.include_router(forecasting.router)
app.include_router(segmentation.router)
app.include_router(anomaly.router)
app.include_router(whatif.router)
app.include_router(recommendations.router)
app.include_router(reports.router)
app.include_router(automation.router)
app.include_router(history.router)
app.include_router(sample.router)
