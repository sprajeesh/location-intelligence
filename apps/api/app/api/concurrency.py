from collections.abc import AsyncGenerator

from fastapi import HTTPException, Request


class InFlightLimiter:
    """Rejects immediately (503) once `max_in_flight` requests are already
    being handled, instead of queuing -- on the single uvicorn worker this API
    runs as, queuing would just convert a fast failure into every caller's
    request hanging behind a handful of large concurrent /location/analyze
    requests.
    """

    def __init__(self, max_in_flight: int) -> None:
        if max_in_flight < 1:
            raise ValueError(f"max_in_flight must be >= 1, got {max_in_flight}")
        self._max_in_flight = max_in_flight
        self._in_flight = 0

    def try_acquire(self) -> bool:
        if self._in_flight >= self._max_in_flight:
            return False
        self._in_flight += 1
        return True

    def release(self) -> None:
        self._in_flight -= 1


async def analyze_capacity_guard(request: Request) -> AsyncGenerator[None, None]:
    limiter: InFlightLimiter = request.app.state.analyze_in_flight_limiter
    if not limiter.try_acquire():
        raise HTTPException(
            status_code=503,
            detail="Server is busy, please retry shortly",
            headers={"Retry-After": "2"},
        )
    try:
        yield
    finally:
        limiter.release()
