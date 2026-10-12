import logging

from fastapi import APIRouter

from app.models.client_error import ClientErrorReport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client-errors", tags=["client-errors"])


@router.post("", status_code=202)
async def report_client_error(body: ClientErrorReport) -> dict[str, str]:
    # Failed API calls are expected traffic (validation, rate limits), so they log at
    # WARNING; uncaught page errors and boundary renders are ERROR.
    level = logging.WARNING if body.kind == "api" else logging.ERROR
    logger.log(
        level,
        "client error reported",
        extra={
            "event": "client.error",
            "kind": body.kind,
            "error_message": body.error_message,
            "stack": body.stack,
            "route": body.route,
            "endpoint": body.endpoint,
            "status": body.status,
            # The failed call's request ID. Matches the request_id on that call's backend
            # log lines. This report's own correlation_id is the action it belongs to.
            "client_request_id": body.request_id,
            "digest": body.digest,
        },
    )
    return {"status": "accepted"}
