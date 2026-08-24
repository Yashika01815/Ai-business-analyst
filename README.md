

````markdown
# AI Business Analyst

> An AI-powered business analytics platform that transforms CSV/XLSX data into actionable business insights.

**Upload Data → Analyze → Visualize → Predict → Decide → Automate**

## ✨ Features

- 📊 **Automated Analytics** — KPIs, charts, trends, correlations, and business insights
- 💬 **Ask Your Data** — Ask natural-language questions about your dataset using Gemini
- 🚨 **Anomaly Detection** — Z-score + Isolation Forest
- 📈 **Forecasting** — Holt-Winters + Linear Regression with MAE/RMSE/MAPE
- 👥 **Customer Segmentation** — K-Means clustering with silhouette-based K selection
- 🔮 **What-If Analysis** — Regression-based decision simulation
- 💡 **AI Recommendations** — Evidence-linked business recommendations
- 📄 **Executive Reports** — Automated business summaries and reports
- 📧 **Email Automation** — Scheduled reports and KPI/anomaly/forecast alerts
- 🔐 **Authentication** — JWT-based secure user authentication

## 🏗️ Architecture

```text
                     CSV / XLSX
                         │
                         ▼
              Data Ingestion & Cleaning
                         │
                         ▼
                    PostgreSQL
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        SQL Analytics        Python Analytics
              │                     │
              └──────────┬──────────┘
                         ▼
                  Analytics + ML
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
      KPIs          Forecasting       Anomalies
      Charts        Segmentation      What-If
      Insights      Recommendations
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                   Gemini AI Layer
                         │
                         ▼
              Ask Your Data + Reports
                         │
                         ▼
                Automation & Email
````

### AI Architecture

Gemini is used for natural-language understanding and tool orchestration. **All numerical results are calculated by the SQL/Python analytics layer**, ensuring that the AI does not invent business numbers.

## 🛠️ Tech Stack

| Layer            | Technologies                                                      |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React.js, Vite, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend          | FastAPI, Python, SQLAlchemy, Pydantic                             |
| Database         | PostgreSQL, SQLite                                                |
| Data Processing  | Pandas, NumPy                                                     |
| Machine Learning | Scikit-learn, Statsmodels                                         |
| AI               | Google Gemini API                                                 |
| Email            | Resend                                                            |
| Authentication   | JWT, bcrypt                                                       |
| Scheduling       | APScheduler                                                       |
| Deployment       | Vercel, Render                                                    |

## 🤖 Analytics & ML

### Anomaly Detection

* Z-score analysis
* Isolation Forest

### Forecasting

* Holt-Winters Exponential Smoothing
* Linear Regression fallback
* MAE, RMSE, and MAPE evaluation

### Segmentation

* K-Means clustering
* Standardized features
* Automatic K selection using Silhouette Score

### What-If Analysis

* Regression-based scenario modelling
* R²-based model evaluation
* Correlation-based, non-causal estimates

### Automated Insights

* Trend analysis
* Top/bottom performer detection
* Correlation analysis
* Business recommendations derived from analytical results

## 📊 Core Workflow

```text
Upload CSV/XLSX
       ↓
Profile & Clean Data
       ↓
Store in PostgreSQL
       ↓
Generate KPIs & Visualizations
       ↓
Detect Trends & Anomalies
       ↓
Forecast Future Performance
       ↓
Segment Customers / Entities
       ↓
Run What-If Scenarios
       ↓
Generate Recommendations
       ↓
Ask Questions Using Gemini
       ↓
Generate Reports & Alerts
       ↓
Send Automated Emails
```

## 🚀 Local Setup

### Prerequisites

* Python 3.11+
* Node.js 18+
* PostgreSQL (optional — SQLite works for local development)

### Backend

```bash
cd backend

python -m venv .venv
```

**Windows:**

```bash
.venv\Scripts\activate
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend API:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Set:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## 🔑 Environment Variables

### Backend

```env
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///./ai_business_analyst.db
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
FRONTEND_ORIGINS=http://localhost:5173
```

Gemini and Resend are optional. Core analytics features can run without these API keys.

### Frontend

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 📁 Project Structure

```text
ai-business-analyst/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── auth.py
│   │
│   ├── sample_data/
│   ├── scripts/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vercel.json
│
└── README.md
```

## 🔒 Data Integrity

The platform is designed around a simple principle:

> **No fabricated analytics.**

KPIs, charts, forecasts, anomalies, clusters, and recommendations are generated from the uploaded dataset and computed through the backend analytics pipeline.

Gemini is responsible for understanding natural-language questions, selecting the appropriate analytical tool, and explaining verified results.

## 🌐 Deployment

### Frontend

Deploy the `frontend/` directory to **Vercel**.

### Backend

Deploy the `backend/` directory to **Render** with PostgreSQL.

Set the required environment variables in the deployment platform.

## 📌 Key Highlights

* Upload and analyze real business datasets
* SQL + Python-based analytics
* Machine-learning-powered insights
* Natural-language data exploration
* Forecasting and anomaly detection
* Customer/entity segmentation
* Decision simulation
* Automated recommendations
* Executive reporting
* Scheduled email automation

---

**Built with React, FastAPI, Python, PostgreSQL, Scikit-learn, Gemini, and Resend.**

```

