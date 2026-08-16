"""Tests for the process-wide in-flight request limiter (app/api/concurrency.py)."""

import pytest

from app.api.concurrency import InFlightLimiter


class TestInFlightLimiterInit:
    def test_rejects_zero_max_in_flight(self) -> None:
        with pytest.raises(ValueError):
            InFlightLimiter(0)

    def test_rejects_negative_max_in_flight(self) -> None:
        with pytest.raises(ValueError):
            InFlightLimiter(-1)


class TestInFlightLimiterAcquireRelease:
    def test_acquires_up_to_the_cap(self) -> None:
        limiter = InFlightLimiter(2)
        assert limiter.try_acquire() is True
        assert limiter.try_acquire() is True

    def test_rejects_once_at_capacity(self) -> None:
        limiter = InFlightLimiter(2)
        limiter.try_acquire()
        limiter.try_acquire()
        assert limiter.try_acquire() is False

    def test_release_frees_a_slot(self) -> None:
        limiter = InFlightLimiter(1)
        assert limiter.try_acquire() is True
        assert limiter.try_acquire() is False
        limiter.release()
        assert limiter.try_acquire() is True
