import logging
import time
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

DEFAULT_FAILURE_THRESHOLD = 5
DEFAULT_COOLDOWN_SECONDS = 30.0


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitOpenError(RuntimeError):
    """Raised instead of invoking the wrapped call while the breaker is open."""


class CircuitBreaker:
    """Fails fast after repeated consecutive failures against one downstream
    dependency, instead of paying that dependency's full timeout/retry cost on
    every request during a real outage.

    Single-process, in-memory state -- correct as long as the API runs as one
    uvicorn worker; would need a shared store (e.g. Redis) to stay correct
    across multiple worker processes.
    """

    def __init__(
        self,
        name: str,
        *,
        failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
        cooldown_seconds: float = DEFAULT_COOLDOWN_SECONDS,
    ) -> None:
        if failure_threshold < 1:
            raise ValueError(f"failure_threshold must be >= 1, got {failure_threshold}")

        self._name = name
        self._failure_threshold = failure_threshold
        self._cooldown_seconds = cooldown_seconds
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._opened_at: float | None = None
        self._half_open_trial_in_flight = False

    def _transition_if_cooldown_elapsed(self) -> None:
        if self._state is CircuitState.OPEN and self._opened_at is not None:
            if time.monotonic() - self._opened_at >= self._cooldown_seconds:
                logger.info("Circuit breaker %s: cooldown elapsed, half-opening", self._name)
                self._state = CircuitState.HALF_OPEN
                self._half_open_trial_in_flight = False

    @property
    def is_open(self) -> bool:
        """True if a call right now would be short-circuited (skipped)."""
        self._transition_if_cooldown_elapsed()
        if self._state is CircuitState.OPEN:
            return True
        if self._state is CircuitState.HALF_OPEN:
            return self._half_open_trial_in_flight
        return False

    def record_success(self) -> None:
        if self._state is not CircuitState.CLOSED:
            logger.info("Circuit breaker %s: closing after successful call", self._name)
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._opened_at = None
        self._half_open_trial_in_flight = False

    def record_failure(self) -> None:
        if self._state is CircuitState.HALF_OPEN:
            logger.warning("Circuit breaker %s: trial call failed, reopening", self._name)
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
            self._half_open_trial_in_flight = False
            return

        self._consecutive_failures += 1
        if self._consecutive_failures >= self._failure_threshold:
            logger.warning(
                "Circuit breaker %s: opening after %d consecutive failures",
                self._name,
                self._consecutive_failures,
            )
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()

    async def call(self, fn: Callable[[], Awaitable[T]]) -> T:
        """Run `fn()`, tracking success/failure. Raises CircuitOpenError
        without calling `fn` at all while the breaker is open (or while a
        half-open trial call is already in flight)."""
        self._transition_if_cooldown_elapsed()

        if self._state is CircuitState.OPEN:
            raise CircuitOpenError(f"Circuit breaker '{self._name}' is open")
        if self._state is CircuitState.HALF_OPEN:
            if self._half_open_trial_in_flight:
                raise CircuitOpenError(f"Circuit breaker '{self._name}' is half-open")
            self._half_open_trial_in_flight = True

        try:
            result = await fn()
        except Exception:
            self.record_failure()
            raise
        else:
            self.record_success()
            return result
