"""Tests for the hand-rolled circuit breaker (app/clients/circuit_breaker.py)."""

from unittest.mock import AsyncMock, patch

import pytest

from app.clients.circuit_breaker import CircuitBreaker, CircuitOpenError


class TestCircuitBreakerInit:
    def test_rejects_zero_failure_threshold(self) -> None:
        with pytest.raises(ValueError):
            CircuitBreaker("test", failure_threshold=0)

    def test_rejects_negative_failure_threshold(self) -> None:
        with pytest.raises(ValueError):
            CircuitBreaker("test", failure_threshold=-1)


class TestCircuitBreakerCall:
    async def test_closed_passes_calls_through(self) -> None:
        breaker = CircuitBreaker("test", failure_threshold=3, cooldown_seconds=30.0)
        fn = AsyncMock(return_value="ok")

        result = await breaker.call(fn)

        assert result == "ok"
        fn.assert_awaited_once()
        assert not breaker.is_open

    async def test_opens_after_exactly_failure_threshold_consecutive_failures(self) -> None:
        breaker = CircuitBreaker("test", failure_threshold=3, cooldown_seconds=30.0)
        failing = AsyncMock(side_effect=RuntimeError("boom"))

        for _ in range(2):
            with pytest.raises(RuntimeError):
                await breaker.call(failing)
        assert not breaker.is_open  # not yet -- only 2 of 3 failures

        with pytest.raises(RuntimeError):
            await breaker.call(failing)
        assert breaker.is_open  # 3rd consecutive failure opens it

    async def test_open_rejects_without_invoking_wrapped_function(self) -> None:
        breaker = CircuitBreaker("test", failure_threshold=1, cooldown_seconds=30.0)
        failing = AsyncMock(side_effect=RuntimeError("boom"))

        with pytest.raises(RuntimeError):
            await breaker.call(failing)
        assert breaker.is_open

        fn = AsyncMock(return_value="should not run")
        with pytest.raises(CircuitOpenError):
            await breaker.call(fn)
        fn.assert_not_awaited()

    async def test_success_while_closed_resets_consecutive_failure_counter(self) -> None:
        breaker = CircuitBreaker("test", failure_threshold=3, cooldown_seconds=30.0)
        failing = AsyncMock(side_effect=RuntimeError("boom"))
        succeeding = AsyncMock(return_value="ok")

        for _ in range(2):
            with pytest.raises(RuntimeError):
                await breaker.call(failing)

        await breaker.call(succeeding)  # resets the counter

        for _ in range(2):
            with pytest.raises(RuntimeError):
                await breaker.call(failing)
        assert not breaker.is_open  # would have opened if the counter hadn't reset

    async def test_half_opens_after_cooldown_and_allows_one_trial_call(self) -> None:
        breaker = CircuitBreaker("test", failure_threshold=1, cooldown_seconds=10.0)
        failing = AsyncMock(side_effect=RuntimeError("boom"))

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=0.0):
            with pytest.raises(RuntimeError):
                await breaker.call(failing)
            assert breaker.is_open

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=5.0):
            assert breaker.is_open  # cooldown not elapsed yet

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=11.0):
            assert not breaker.is_open  # cooldown elapsed -- half-open, trial call allowed

            succeeding = AsyncMock(return_value="ok")
            result = await breaker.call(succeeding)
            assert result == "ok"

        assert not breaker.is_open  # half-open trial succeeded -- fully closed

    async def test_half_open_trial_failure_reopens_and_restarts_cooldown(self) -> None:
        breaker = CircuitBreaker("test", failure_threshold=1, cooldown_seconds=10.0)
        failing = AsyncMock(side_effect=RuntimeError("boom"))

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=0.0):
            with pytest.raises(RuntimeError):
                await breaker.call(failing)

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=11.0):
            with pytest.raises(RuntimeError):
                await breaker.call(failing)  # half-open trial fails
            assert breaker.is_open

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=15.0):
            assert breaker.is_open  # new cooldown window, not elapsed yet

        with patch("app.clients.circuit_breaker.time.monotonic", return_value=22.0):
            assert not breaker.is_open  # new cooldown (started at t=11) has now elapsed
