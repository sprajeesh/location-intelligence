"""Redis-backed store for report jobs: status JSON plus the rendered PDF.

The shared Redis client decodes responses to str, so PDF bytes are stored
base64-encoded. Everything expires after `ttl_seconds`.
"""

import base64
import json
import logging
from datetime import UTC, datetime, timedelta

import redis.asyncio as aioredis

from app.schemas.responses import ReportJobStatus

logger = logging.getLogger(__name__)


class ReportStoreUnavailable(Exception):
    """Redis is not configured/reachable, so jobs can't be tracked."""


class ReportJobStore:
    def __init__(self, client: aioredis.Redis | None, ttl_seconds: int) -> None:
        self._client = client
        self._ttl = ttl_seconds

    @property
    def available(self) -> bool:
        return self._client is not None

    @staticmethod
    def _job_key(job_id: str) -> str:
        return f"report:job:{job_id}"

    @staticmethod
    def _pdf_key(job_id: str) -> str:
        return f"report:pdf:{job_id}"

    def _require(self) -> aioredis.Redis:
        if self._client is None:
            raise ReportStoreUnavailable
        return self._client

    async def set_status(
        self,
        job_id: str,
        status: str,
        *,
        error: str | None = None,
        filename: str | None = None,
    ) -> None:
        client = self._require()
        expires = datetime.now(UTC) + timedelta(seconds=self._ttl)
        payload = {
            "jobId": job_id,
            "status": status,
            "error": error,
            "filename": filename,
            "expiresAt": expires.isoformat(),
        }
        try:
            await client.set(self._job_key(job_id), json.dumps(payload), ex=self._ttl)
        except Exception as exc:
            logger.warning("Report status write failed for %s: %s", job_id, exc)
            raise ReportStoreUnavailable from exc

    async def get_status(self, job_id: str) -> ReportJobStatus | None:
        client = self._require()
        try:
            raw = await client.get(self._job_key(job_id))
        except Exception as exc:
            logger.warning("Report status read failed for %s: %s", job_id, exc)
            raise ReportStoreUnavailable from exc
        return ReportJobStatus(**json.loads(raw)) if raw else None

    async def save_pdf(self, job_id: str, pdf: bytes) -> None:
        client = self._require()
        try:
            await client.set(
                self._pdf_key(job_id), base64.b64encode(pdf).decode("ascii"), ex=self._ttl
            )
        except Exception as exc:
            logger.warning("Report PDF write failed for %s: %s", job_id, exc)
            raise ReportStoreUnavailable from exc

    async def get_pdf(self, job_id: str) -> bytes | None:
        client = self._require()
        try:
            raw = await client.get(self._pdf_key(job_id))
        except Exception as exc:
            logger.warning("Report PDF read failed for %s: %s", job_id, exc)
            raise ReportStoreUnavailable from exc
        return base64.b64decode(raw) if raw else None
