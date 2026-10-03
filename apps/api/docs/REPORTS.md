# Address Intelligence Report (PDF)

Users can generate a full PDF report for an analysed address from the Results
Panel. Generation is asynchronous: the web app starts a job, polls it, and
offers the PDF when it is ready. The endpoints take the same inputs as
`POST /location/analyze` and never branch on user/session/auth state — omitted
params use the API defaults, like every other endpoint.

## Endpoints

| Method | Path                      | Notes                                                                                   |
| ------ | ------------------------- | --------------------------------------------------------------------------------------- |
| POST   | `/reports`                | Body = `AnalyzeRequest`. `202 {"jobId", "status": "queued"}`. Rate limited.             |
| GET    | `/reports/{jobId}`        | `{jobId, status, error?, expiresAt?, filename?}`; `status` is `queued\|running\|ready\|failed`. |
| GET    | `/reports/{jobId}/download` | `application/pdf` attachment. `409` if not ready, `404` if unknown/expired.           |

Errors: `422` invalid body, `404` unknown/expired/malformed id, `409` not ready,
`503` (with `Retry-After`) when Redis is unavailable or the concurrent-render cap
is hit. A job that fails *while running* (e.g. address not found, render error)
reports `status: "failed"` with a safe `error` string; internal details are only
logged.

## Job lifecycle

1. `POST /reports` stores `queued` status in Redis and schedules a background
   task (`app/services/report_jobs.py`).
2. The task sets `running`, runs the shared analyze pipeline
   (`run_analysis` in `app/api/analyze.py`), builds `ReportData`, renders the PDF
   in a worker thread (`asyncio.to_thread`, rendering is CPU-bound), stores it
   base64-encoded, then sets `ready`.
3. Status and PDF expire together after `REPORT_TTL_SECONDS`.

Storage is Redis only (`app/repositories/report_jobs.py`); there is no
persistent report storage. Without Redis the endpoints return `503`.

## Report layout ("Executive + detail")

1. **Summary** — address, date, radius, mode, overall + category scores,
   coverage, top strengths / biggest gaps, data notes.
2. **Category sections** — one block per scored facility type: score bar,
   nearest/count/decay, breakup table (proximity × weight + density × weight =
   facility score) and, for low scores, a one-line improvement hint.
3. **Facility map** — vector plan view around the address (no tile calls).
4. **Facility appendix** — every facility, grouped by category.
5. **Methodology & data sources** — formulas in plain language, sources and
   licences, analysis warnings, generation time and app version.

## Where to change things

| To change…                      | Edit                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| What data a report contains     | `app/services/report_data.py` (`ReportData`, `build_report_data`) |
| Low-score threshold / hint text | `app/services/report_hints.py` (`LOW_SCORE_THRESHOLD`, `build_hint`) |
| Summary & category pages        | `app/services/report_pdf.py`                                |
| Map, appendix, methodology      | `app/services/report_sections.py` (`DEFAULT_SECTIONS`)       |
| Fonts                           | `app/assets/fonts/` (DejaVu Sans; covers NZ macrons)         |

Hints are computed by re-running the real scoring math with one hypothetical
change (a facility at the typical range), so they follow the DB-loaded facility
config automatically. `LOW_SCORE_THRESHOLD` is currently `50`.

To add a section, write a `(ReportData, styles) -> list[Flowable]` function and
append it to `DEFAULT_SECTIONS`. The methodology text and sources list in
`report_sections.py` mirror the web app's `/data-sources` page — keep them in
sync when a source changes.

## Configuration

| Env var                          | Default | Meaning                                         |
| -------------------------------- | ------- | ----------------------------------------------- |
| `REPORT_TTL_SECONDS`             | `3600`  | How long a job and its PDF stay downloadable    |
| `REPORT_MAX_IN_FLIGHT`           | `2`     | Concurrent renders per process (fast `503` above) |
| `REPORT_RENDER_TIMEOUT_SECONDS`  | `60`    | A render longer than this marks the job `failed` and frees its slot |
| `RATE_LIMIT_REPORT_TIMES`        | `5`     | `POST /reports` calls allowed per window per client |
| `RATE_LIMIT_REPORT_SECONDS`      | `60`    | Rate-limit window                               |

Status polling and downloads are not rate limited (a job id is an unguessable
UUIDv4 and polling is cheap).

## Web app

BFF routes `src/app/api/reports/**` proxy the three endpoints.
`useReportGeneration` (polling with backoff, 2 min timeout, resets when the
analysis target changes) drives `ReportButton`, which sits in the Results Panel
in the primary colour; success/failure toasts carry **Download** / **Retry**
actions. Strings live under `results.report.*` in `en.json`.

## Tests

- `tests/test_report_data.py` — breakup maths, hints, thresholds
- `tests/test_report_pdf.py` — layout/content, unicode, map failure, pagination
- `tests/test_report_api.py` — job endpoints and failure modes
- `tests/test_report_integration.py` — real analyze + PDF pipeline, accuracy vs `/location/analyze`, edge cases
- `src/hooks/useReportGeneration.test.tsx`, `src/components/ReportButton/*.test.tsx`
- `e2e/report-generation.spec.ts` — Playwright, backend mocked
