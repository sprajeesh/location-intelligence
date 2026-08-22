# syntax=docker/dockerfile:1

FROM python:3.13-slim AS builder

# build-essential is needed for any dependency without a prebuilt arm64 wheel
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install deps before copying app code so this layer caches across code changes
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY alembic.ini ./
COPY alembic alembic/
COPY app app/
RUN uv sync --frozen --no-dev


FROM python:3.13-slim AS runtime

WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser
COPY --from=builder /app /app
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH"

USER appuser

EXPOSE 8000

# Call uvicorn directly from the synced venv via entrypoint script which runs migrations first
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
