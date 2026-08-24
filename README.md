# AI Business Analyst

An AI-powered business analytics platform that replaces repetitive Excel work with an automated pipeline:
**upload a spreadsheet → get instant KPIs, visualizations, verified natural-language answers, forecasts,
segmentation, anomaly detection, what-if scenarios, recommendations, and automated email reports.**

Every number shown in the product is computed by real SQL and Python — the AI layer (Google Gemini) is used
strictly for *tool selection* and *natural-language explanation*, never for inventing figures.

---

## 1. Architecture Overview

```
┌─────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│   React + Vite SPA   │ ────────────────────────▶│   FastAPI backend (Render) │
│   (Vercel)            │◀──────────────────────── │                            │
└─────────────────────┘                            │  ┌──────────────────────┐ │
                                                     │  │ Ingestion & Cleaning │ │
                                                     │  ├──────────────────────┤ │
                                                     │  │ SQL Analytics Layer  │ │  ──▶ PostgreSQL
                                                     │  ├──────────────────────┤ │
                                                     │  │ Python/Pandas Layer  │ │
                                                     │  ├──────────────────────┤ │
                                                     │  │ ML Layer (sklearn,   │ │
                                                     │  │ statsmodels)         │ │
                                                     │  ├──────────────────────┤ │
                                                     │  │ Gemini Orchestrator  │ │  ──▶ Google Gemini API
                                                     │  ├──────────────────────┤ │
                                                     │  │ Reporting Layer      │ │
                                                     │  ├──────────────────────┤ │
                                                     │  │ Automation & Email   │ │  ──▶ Resend API
                                                     │  └──────────────────────┘ │
                                                     └───────────────────────────┘
```

Each layer is a separate, independently testable module under `backend/app/services/`. The API layer
(`backend/app/routers/`) is a thin wrapper that authenticates the request, calls the relevant service(s),
optionally logs an `AnalysisRecord` for history, and returns JSON.

### Why this separation matters
- The **SQL/Pandas layer is the single source of truth** for every number. Nothing the AI says is trusted
  blindly — Gemini's job in "Ask Your Data" is to pick which verified tool (`run_sql`, `aggregate`,
  `describe_metric`) answers a question, and to explain the *already-computed* result in plain English.
- If `GEMINI_API_KEY` is not set, the app **still works** — a deterministic heuristic planner and
  templated explanations take over so KPIs, charts, forecasts, segmentation, anomaly detection, and even
  Ask Your Data remain functional (with reduced natural-language flexibility). This makes local development
  and grading trivial without needing a key.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Recharts, Axios, React Router |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2.x, Pydantic v2 |
| Database | PostgreSQL (SQLite fallback for zero-config local dev) |
| Data processing | Pandas, NumPy |
| Machine learning | scikit-learn (KMeans, IsolationForest, LinearRegression), statsmodels (Holt-Winters) |
| AI layer | Google Gemini (`google-generativeai`) |
| Email | Resend |
| Scheduling | APScheduler (in-process background scheduler) |
| Auth | JWT (python-jose) + bcrypt password hashing |
| Deployment | Vercel (frontend), Render (backend + managed Postgres) |

---

## 3. Project Structure

```
ai-business-analyst/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, router registration, lifespan
│   │   ├── config.py               # Environment-driven settings
│   │   ├── database.py             # SQLAlchemy engine/session (Postgres or SQLite)
│   │   ├── auth.py                 # JWT dependency for protected routes
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── routers/                # One router per feature area (see §5)
│   │   ├── services/                # Core business logic (see §4)
│   │   └── utils/                  # security.py (JWT/bcrypt), logger.py
│   ├── sample_data/                 # Generated demo CSVs (sales, marketing, customers)
│   ├── scripts/generate_sample_data.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── render.yaml                  # Render deployment blueprint
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.tsx, App.tsx
    │   ├── lib/api.ts               # Typed API client for every backend endpoint
    │   ├── context/                  # AuthContext, DatasetContext
    │   ├── components/               # Sidebar, Topbar, AppLayout, KpiCard, ChartCard, Shared UI
    │   └── pages/                    # One page per application area (see §6)
    ├── package.json
    ├── vercel.json
    └── .env.example
```

---

## 4. Backend Services (the analytics engine)

| Service | Responsibility |
|---|---|
| `ingestion.py` | Reads CSV/XLSX, profiles columns (type/role/missing/outliers), applies conservative logged cleaning (median/mode imputation, duplicate removal, date parsing), persists the cleaned frame into its own SQL table via `to_sql`. |
| `analytics.py` | Loads a dataset table, computes dynamic KPIs and auto-selects chart types (line/bar/donut/scatter) based on detected metrics and dimensions. Also exposes `run_sql` used by the Ask Your Data tool. |
| `insights_engine.py` | Rule-based automated insight generation: month-over-month trend changes, top/bottom performers by dimension, Pearson correlations (\|r\| ≥ 0.6) between numeric metrics. |
| `anomaly_engine.py` | Z-score analysis (\|z\| ≥ 2.0) on time-aggregated metrics + IsolationForest for multivariate row-level outliers. |
| `forecasting_engine.py` | Chooses Holt-Winters Exponential Smoothing (with/without seasonality) when ≥12 periods are available, otherwise falls back to linear regression. Reports MAE/RMSE/MAPE from a holdout split of real historical data. |
| `segmentation_engine.py` | K-Means clustering on standardized, aggregated entity-level features; automatically selects `k` via silhouette score; generates human-readable segment labels (e.g. "High Monthly Revenue Segment"). |
| `whatif_engine.py` | Fits an explicit linear regression between a driver and target metric, and projects the target at a hypothetical driver change. Reports R², confidence level, and an explicit causation disclaimer. |
| `recommendation_engine.py` | Converts insights + anomalies into prioritized, evidence-linked recommendations — never generic advice. |
| `report_generator.py` | Assembles the full executive report (KPIs, charts, insights, anomalies, forecast, recommendations, methodology, limitations). |
| `gemini_client.py` / `gemini_orchestrator.py` | Gemini tool-calling layer for Ask Your Data. Gemini picks one of `run_sql` / `aggregate` / `describe_metric`, the backend executes it, and Gemini (or a deterministic template if no API key) explains the verified result. SQL is restricted to `SELECT`-only with a keyword blocklist. |
| `email_service.py` | Resend wrapper + HTML email templates for scheduled reports and alerts. |
| `automation_service.py` / `scheduler.py` | Evaluates schedule/threshold/anomaly automation rules, compares dataset snapshots over time, and triggers email delivery + Alert Center entries. Runs on a 15-minute APScheduler interval. |

---

## 5. API Reference (high level)

All routes except `/api/auth/*` and `/api/health` require a `Bearer` JWT.

| Prefix | Purpose |
|---|---|
| `POST /api/auth/register`, `/login`, `GET /me` | Auth |
| `POST /api/datasets/upload`, `GET /api/datasets`, `GET /{id}`, `GET /{id}/preview`, `DELETE /{id}` | Dataset lifecycle |
| `POST /api/sample/{key}` | Instantly load a demo dataset (sales / marketing / customers) |
| `GET /api/dashboard/{id}` | KPIs + charts + filter options |
| `POST /api/ask` | Natural-language Q&A (Gemini tool orchestration) |
| `GET /api/insights/{id}` | Automated insight scan |
| `GET /api/anomaly/{id}` | Anomaly detection |
| `POST /api/forecast`, `GET /api/forecast/{id}/metrics` | Forecasting |
| `POST /api/segmentation` | Clustering |
| `POST /api/whatif` | Decision simulator |
| `GET /api/recommendations/{id}` | Recommendations |
| `GET /api/reports/{id}` | Full executive report |
| `POST/GET/PATCH/DELETE /api/automation/rules`, `/api/automation/alerts` | Automation Center |
| `GET /api/history` | Analysis History |

Interactive OpenAPI docs are available at `{BACKEND_URL}/docs` once the server is running.

---

## 6. Frontend Pages

Landing · Login/Register · Dashboard · Upload · Dataset Explorer · Data Quality Center · Visual Analytics ·
Automated Insights · Ask Your Data · Anomaly Detection · Forecasting Studio · Segmentation ·
Decision Simulator · Recommendations · Reports · Automation Center · Analysis History · Settings.

Each page lives in `frontend/src/pages/`, uses the shared `AppLayout`/`Sidebar`/`Topbar` shell, and reads the
currently selected dataset from `DatasetContext`. Empty states, skeleton loaders, and error states are
implemented for every page — no page ever shows fabricated data.

---

## 7. Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) PostgreSQL — SQLite is used automatically if `DATABASE_URL` is left at its default.

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                     # then edit values as needed
python scripts/generate_sample_data.py                    # regenerate sample CSVs (already included)
uvicorn app.main:app --reload --port 8000
```

The backend creates its tables automatically on startup (`Base.metadata.create_all`) — no manual migration
step is required for local development or the default SQLite database.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env                                      # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Visit `http://localhost:5173`, register an account, then either upload your own CSV/XLSX or click one of the
sample datasets on the Upload page to see the full product working within seconds.

---

## 8. Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret — set a long random value in production |
| `DATABASE_URL` | `sqlite:///./ai_business_analyst.db` locally, or a Postgres URL in production |
| `GEMINI_API_KEY` | Google Gemini API key. **Optional** — the app degrades gracefully without it |
| `GEMINI_MODEL` | Defaults to `gemini-1.5-flash` |
| `RESEND_API_KEY` | Resend API key for automation emails. **Optional** — email sends are logged/skipped without it |
| `ALERT_FROM_EMAIL` | Verified sender address in Resend |
| `FRONTEND_ORIGINS` | Comma-separated allowed CORS origins (your Vercel URL) |
| `MAX_UPLOAD_MB` | Upload size limit (default 25) |
| `ENABLE_SCHEDULER` | Set `false` to disable the in-process automation scheduler |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the deployed backend, no trailing slash |

---

## 9. Deployment

### Backend → Render
1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and point it at `backend/render.yaml`, or manually create a
   **Docker** web service using `backend/Dockerfile`.
3. Attach a Render PostgreSQL instance (the blueprint provisions one automatically as `ai-business-analyst-db`
   and injects `DATABASE_URL`).
4. Set `GEMINI_API_KEY` and `RESEND_API_KEY` as secret environment variables in the Render dashboard
   (`sync: false` in the blueprint means Render will prompt for them).
5. Set `FRONTEND_ORIGINS` to your Vercel domain once it exists.
6. Render's health check hits `GET /api/health`.

### Frontend → Vercel
1. Import the `frontend/` directory as a new Vercel project (framework preset: Vite).
2. Set the environment variable `VITE_API_BASE_URL` to your Render backend URL.
3. `vercel.json` is already configured to rewrite all routes to `index.html` for client-side routing.
4. Deploy — Vercel runs `npm run build` and serves `dist/`.

---

## 10. Machine Learning & Statistical Methodology

This section exists so the project is technically defensible in a live discussion.

- **Data cleaning**: header whitespace trimming, exact-duplicate row removal, `pd.to_datetime` parsing for
  detected date columns, median imputation for numeric columns with <40% missingness (columns above that
  threshold are flagged, not imputed, to avoid misleading results), mode/"Unknown" fill for categorical
  columns. Every operation is logged and shown in the Data Quality Center — nothing changes silently.
- **KPI/column role detection**: heuristic classification using dtype plus keyword matching against common
  business terms (revenue, sales, cost, region, product, customer, etc.), so the platform is not hardcoded to
  one schema.
- **Insights**: month-over-month trend deltas ≥5%, performer gap vs. group mean, Pearson correlation with
  \|r\| ≥ 0.6 — thresholds chosen to surface only meaningful signals, not noise.
- **Anomaly detection**: time-series anomalies via z-score (\|z\| ≥ 2.0 = warning, ≥ 3.0 = critical) on
  period-aggregated metrics; multivariate anomalies via `IsolationForest` (contamination = 3%) across numeric
  feature space, with the anomalous record's associated dimensions surfaced for context.
- **Forecasting**: Holt-Winters Exponential Smoothing (additive trend, additive seasonality when ≥2 full
  seasonal cycles of history exist) as the primary method; linear trend regression as a robust fallback for
  short series. Accuracy (MAE/RMSE/MAPE) is computed on a genuine holdout split of historical data, not
  in-sample.
- **Segmentation**: features are aggregated to the entity level (sum/mean/count per numeric column),
  standardized with `StandardScaler`, clustered with `KMeans`, and `k` is selected by maximizing silhouette
  score over k=2..6 (or provided explicitly by the user). Cluster labels are generated from the feature with
  the largest standardized deviation from the overall mean.
- **What-if / decision simulator**: a single-variable `LinearRegression` between an aggregated driver and
  target metric. Reports R² as a measure of fit quality and a confidence label (low/moderate/high) that
  scales with it. Explicitly labeled as a correlational, not causal, estimate.
- **Recommendations**: purely derived from the outputs above (never a free-standing LLM guess), ranked by a
  simple high/medium/low priority heuristic.

---

## 11. Design Principles

- **No fabricated data anywhere.** Every KPI, chart, forecast, cluster, anomaly, and recommendation is
  computed from the actual uploaded dataset. If a dataset lacks what a feature needs (e.g. no date column for
  forecasting), the API returns a clear 400 error explaining why, and the UI surfaces that message directly.
- **Full transparency.** The Data Quality Center shows every cleaning operation performed. Ask Your Data
  exposes an expandable "How this was calculated" section with the SQL/method used for every answer.
- **Graceful degradation.** Missing `GEMINI_API_KEY` or `RESEND_API_KEY` doesn't break the app — it falls
  back to deterministic logic and logs a clear warning, so the demo experience is never blocked by unset
  secrets.
