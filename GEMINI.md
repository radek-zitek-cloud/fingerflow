# FingerFlow Project Context

## Project Overview
**FingerFlow** is a high-performance typing diagnostics tool designed to track detailed bio-mechanical data (keystroke latency, dwell time, flight time) to optimize user typing efficiency. Unlike standard WPM trackers, it focuses on individual finger performance and smooth, motion-based visual feedback.

## Architecture & Tech Stack
The project follows a strict Full-Stack architecture:

### Backend
*   **Language:** Python 3.10+
*   **Framework:** FastAPI (Async is mandatory)
*   **Database:** SQLite (Dev) / PostgreSQL (Prod) with SQLAlchemy 2.0+
*   **Authentication:** JWT (python-jose) + Google OAuth2
*   **Logging:** `structlog` (JSON output)

### Frontend
*   **Framework:** React 18+ (Functional Components, Hooks)
*   **Styling:** Pure CSS Variables for theming; Tailwind CSS for layout geometry only.
*   **Telemetry:** Custom high-frequency event capturing with batching.

## Directory Structure
*   `backend/`: Contains the FastAPI application code.
    *   `data/`: Storage for local SQLite database.
    *   `logs/`: Application logs.
*   `frontend/`: Contains the React application code.
*   `docs/`: Documentation and specifications.
    *   **`master_spec.md`**: The comprehensive Master Specification. **Refer to this file for detailed requirements on database schema, API endpoints, and UI behavior.**

## Project Status
**Current State:** Initial Skeleton / Setup Phase.
The project directories (`backend`, `frontend`) are currently empty (except for `.gitignore` files). The immediate goal is to scaffold the application following the "Development Workflow" defined in `docs/master_spec.md`.

## Development Workflow (Planned)
The following steps are outlined in the Master Spec:
1.  **Backend Skeleton:** Setup FastAPI, structlog, and Database/Models.
2.  **Auth Layer:** Implement JWT and Google OAuth stub.
3.  **API & Analytics:** Create telemetry ingestion and analytics endpoints.
4.  **Frontend Logic:** Setup React, TelemetryManager, and Input Handling.
5.  **UI Construction:** Build TickerTape, RollingWindow, and VirtualKeyboard components.

## Building and Running (Future)
*   **Backend:** Expected to run via `uvicorn`.
*   **Frontend:** Expected to run via standard Node scripts (e.g., `npm run dev`).

*Refer to `docs/master_spec.md` for strict implementation rules regarding telemetry ingestion and UI smoothness.*
