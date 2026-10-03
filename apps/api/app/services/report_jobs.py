"""Runs one report job: analyze -> report data -> PDF, off the event loop."""

import asyncio
import logging
import re
import unicodedata

from fastapi import HTTPException

from app.api.analyze import run_analysis
from app.config.version import get_version
from app.repositories.report_jobs import ReportJobStore, ReportStoreUnavailable
from app.schemas.requests import AnalyzeRequest
from app.services.report_data import build_report_data
from app.services.report_pdf import render_report_pdf

logger = logging.getLogger(__name__)

GENERIC_FAILURE = "Report generation failed. Please try again."


def report_filename(address: str) -> str:
    """ASCII-safe filename derived from the address (macrons folded, junk dropped)."""
    folded = unicodedata.normalize("NFKD", address).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")[:60].strip("-")
    return f"intelligence-report-{slug}.pdf" if slug else "intelligence-report.pdf"


async def run_report_job(job_id: str, body: AnalyzeRequest, state, store: ReportJobStore) -> None:
    """Never raises: every outcome is recorded on the job (or logged if Redis is gone)."""
    try:
        await store.set_status(job_id, "running")
        analysis = await run_analysis(state, body)
        data = build_report_data(
            analysis,
            state.scoring_config,
            radius_km=body.radius_km,
            distance_mode=body.distance_mode,
            app_version=get_version(),
        )
        pdf = await asyncio.to_thread(render_report_pdf, data)
        await store.save_pdf(job_id, pdf)
        await store.set_status(job_id, "ready", filename=report_filename(data.address))
    except ReportStoreUnavailable:
        logger.error("Report job %s lost its Redis store", job_id)
    except HTTPException as exc:
        await _fail(store, job_id, str(exc.detail))
    except Exception:
        logger.exception("Report job %s failed", job_id)
        await _fail(store, job_id, GENERIC_FAILURE)


async def _fail(store: ReportJobStore, job_id: str, message: str) -> None:
    try:
        await store.set_status(job_id, "failed", error=message)
    except ReportStoreUnavailable:
        logger.error("Could not record failure for report job %s", job_id)
