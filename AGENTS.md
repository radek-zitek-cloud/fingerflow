# Repository Guidelines

## Project Structure & Module Organization

- `docs/master_spec.md`: source-of-truth for product requirements and the intended stack.
- `backend/`: planned Python FastAPI API + telemetry ingestion service.
  - `backend/data/`: local data (gitignored).
  - `backend/logs/`: local logs (gitignored).
  - `backend/.env*`: environment files are gitignored (see `backend/.gitignore`).
- `frontend/`: planned React client for high-frequency key event capture and UI.

## Build, Test, and Development Commands

This repository is currently a scaffold (no build scripts/manifests committed yet). When adding them, keep developer entrypoints consistent with the following conventions:

- Backend (from `backend/`):
  - `uvicorn app.main:app --reload` (run API locally)
  - `pytest` (run backend tests)
- Frontend (from `frontend/`):
  - `pnpm dev` (run the app locally)
  - `pnpm test` (run unit tests)
  - `pnpm lint` / `pnpm format` (static checks)

If you introduce different commands, document them in `README.md` and/or add a top-level `Makefile` with `make dev`, `make test`, etc.

## Coding Style & Naming Conventions

- Python: 4-space indentation, type hints, async endpoints for telemetry ingestion. Follow the spec’s guidance on FastAPI + SQLAlchemy 2.0 patterns.
- Frontend: React functional components + hooks. Use CSS variables for all theme colors; Tailwind (if used) is for layout geometry only (grid/flex/spacing), not colors.
- Naming: prefer descriptive module names (`telemetry_ingest.py`, `sessions_service.py`) and test names mirroring modules (`test_telemetry_ingest.py`).

## Testing Guidelines

- Add tests alongside the code you change; keep them fast and deterministic.
- Suggested conventions:
  - Backend: `pytest` with files named `test_*.py`.
  - Frontend: `*.test.ts(x)` for unit tests; add e2e only when necessary.

## Commit & Pull Request Guidelines

- Git history is minimal; use a clear convention going forward (recommended: Conventional Commits like `feat:`, `fix:`, `chore:`).
- PRs should include: a short summary, linked issue/spec section (e.g., “Spec §4.2 Telemetry Ingestion”), and screenshots/GIFs for UI changes.
- Performance-sensitive changes (telemetry ingestion, logging) should include a brief note on throughput/latency impact.

## Security & Configuration Tips

- Never commit secrets. Use `.env` files locally (already gitignored under `backend/`).
- Avoid logging raw keystrokes/content; prefer aggregated metrics and structured context.
