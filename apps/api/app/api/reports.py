import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response

from app.api.rate_limit import rate_limiter
from app.config.settings import get_settings
from app.repositories.report_jobs import ReportJobStore, ReportStoreUnavailable
from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import ReportJobCreated, ReportJobStatus
from app.services.report_jobs import run_report_job

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])

UNAVAILABLE = HTTPException(
    status_code=503,
    detail="Report generation is temporarily unavailable",
    headers={"Retry-After": "5"},
)


def _store(request: Request) -> ReportJobStore:
    return request.app.state.report_store


def _valid_job_id(job_id: str) -> str:
    """Unknown or malformed ids are indistinguishable: both 404."""
    try:
        uuid.UUID(job_id, version=4)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found") from None
    return job_id


async def report_capacity_guard(request: Request) -> None:
    """Fast 503 (no queueing) once the concurrent-render cap is hit. Released by the
    job runner wrapper below once the background task finishes."""
    if not request.app.state.report_in_flight_limiter.try_acquire():
        raise HTTPException(
            status_code=503,
            detail="Server is busy, please retry shortly",
            headers={"Retry-After": "5"},
        )


def _settings_rate_limit():
    settings = get_settings()
    return rate_limiter(settings.rate_limit_report_times, settings.rate_limit_report_seconds)


@router.post(
    "",
    status_code=202,
    response_model=ReportJobCreated,
    dependencies=[Depends(_settings_rate_limit())],
)
async def create_report(
    body: AnalyzeRequest, request: Request, background: BackgroundTasks
) -> ReportJobCreated:
    store = _store(request)
    if not store.available:
        raise UNAVAILABLE

    await report_capacity_guard(request)
    limiter = request.app.state.report_in_flight_limiter
    job_id = str(uuid.uuid4())
    try:
        await store.set_status(job_id, "queued")
    except ReportStoreUnavailable:
        limiter.release()
        raise UNAVAILABLE from None

    async def job() -> None:
        try:
            await run_report_job(job_id, body, request.app.state, store)
        finally:
            limiter.release()

    background.add_task(job)
    return ReportJobCreated(jobId=job_id, status="queued")


@router.get("/{job_id}", response_model=ReportJobStatus)
async def get_report_status(job_id: str, request: Request) -> ReportJobStatus:
    job_id = _valid_job_id(job_id)
    try:
        status = await _store(request).get_status(job_id)
    except ReportStoreUnavailable:
        raise UNAVAILABLE from None
    if status is None:
        raise HTTPException(status_code=404, detail="Report not found or expired")
    return status


@router.get("/{job_id}/download")
async def download_report(job_id: str, request: Request) -> Response:
    job_id = _valid_job_id(job_id)
    store = _store(request)
    try:
        status = await store.get_status(job_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Report not found or expired")
        if status.status != "ready":
            raise HTTPException(status_code=409, detail=f"Report is {status.status}")
        pdf = await store.get_pdf(job_id)
    except ReportStoreUnavailable:
        raise UNAVAILABLE from None
    if pdf is None:
        raise HTTPException(status_code=404, detail="Report not found or expired")
    filename = status.filename or "intelligence-report.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
