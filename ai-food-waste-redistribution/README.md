# AI Food Waste Redistribution

Connecting surplus food to people who need it — verified by AI, matched by distance and demand, and closed with a scan.

Minor project (Software Engineering elective) — B.Tech IT, BPIT (GGSIPU).

Full design record (SRS, architecture, ER/UML, roadmap): see the Module 1 design artifact.

## Structure

This is a monorepo with three independently runnable services and a shared database layer:

| Path | What it is | Run with |
|---|---|---|
| [client/](client/) | React + Tailwind SPA | `cd client && npm install && npm run dev` |
| [server/](server/) | Node.js + Express API (MVC) | `cd server && npm install && npm run dev` |
| [ai-service/](ai-service/) | Python FastAPI microservice (food recognition + freshness) | `cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload` |
| [database/](database/) | SQL migrations + seeds | `cd database && node migrate.js` (needs `server/.env` DB vars) |

## Prerequisites

- Node.js 18+
- Python 3.10+
- MySQL 8+

## First-time setup

1. Copy each service's `.env.example` to `.env` and fill in local values:
   - `server/.env`
   - `client/.env`
   - `ai-service/.env`
2. Create the database: `mysql -u root -p -e "CREATE DATABASE food_waste_redistribution;"`
3. Run migrations: `cd database && node migrate.js`
4. Start each service in its own terminal (table above).
5. Health checks:
   - API: `GET http://localhost:5000/api/health`
   - AI service: `GET http://localhost:8000/health`

## Core donation flow

Each step is one role's action on the dashboard:

| Step | Who | What happens | API |
|---|---|---|---|
| 1. Post | Donor | Photo + food details. The safe window (`expiry_estimate`) is computed from category + storage + prepared time. | `POST /api/donations` |
| 2. AI check | automatic | Photo is scored by the AI service; below `freshness.fresh_min_score` → `spoiled` and the donation is rejected. If the AI service is down the donation is still saved as `pending` and the donor can retry. | `POST /api/donations/:id/retry` |
| 3. Match | automatic → NGO | Up to 5 NGOs within 15 km that accept the food's diet are ranked by distance + demand and offered it, with a "why you" breakdown. First to accept wins. | `GET /api/matches`, `POST /api/matches/:id/accept` · `/reject` |
| 4. QR pickup | Volunteer | Volunteer claims the pickup, then scans the donor's pickup QR at collection. | `POST /api/tasks/:id/claim`, `GET /api/donations/:id/pickup-code`, `POST /api/tasks/:id/pickup` |
| 5. Delivery | Volunteer | Volunteer scans the NGO's delivery QR at hand-over; meals served and CO₂ avoided are logged. | `GET /api/donations/:id/delivery-code`, `POST /api/tasks/:id/deliver` |

Every step writes a row to `notifications`, shown in each dashboard's Updates card.

### AI service setup

Python 3.13 can't install the pinned versions in `requirements.txt` (TensorFlow 2.16 needs ≤ 3.12), so for local development use a venv:

```bash
cd ai-service
py -3.13 -m venv .venv
.venv/Scripts/python -m pip install fastapi "uvicorn[standard]" python-dotenv pydantic pillow numpy python-multipart
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Until a trained model is placed at `FRESHNESS_MODEL_PATH`, freshness is scored by `heuristic-v1`, a colour-statistics check for mould and rot. It is not a trained classifier, and the UI labels it as such.

### Tests

- `cd server && npm test`: API tests, including the full post → delivery flow against the real database (AI mocked).
- `cd ai-service && .venv/Scripts/python -m pytest tests`

## Roadmap

This is Module 2 of 13 — Project Setup & Base Architecture. See the Module 1 design artifact for the full 13-module roadmap and rationale behind every structural decision here.
