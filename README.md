# Forte

Music taste engine with ELO-based song rating and ML-powered taste insights.

## Stack

- **Frontend:** React + TypeScript, Tailwind CSS, Recharts
- **Backend:** FastAPI (Python)
- **Database:** Supabase (Postgres)
- **Auth:** Spotify OAuth 2.0
- **ML:** scikit-learn, UMAP, ruptures

## Setup

### 1. Supabase

Run the migration in `supabase/migrations/001_initial_schema.sql` against your Supabase project (SQL editor or CLI).

### 2. Spotify

Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Add redirect URI:

```
http://127.0.0.1:8000/auth/callback
```

### 3. Environment

Copy `.env.example` to `backend/.env` and fill in:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_KEY=          # service_role key for backend
JWT_SECRET=
FRONTEND_URL=http://127.0.0.1:5173
```

### 4. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Self-check ELO math:

```bash
python -m app.services.elo_check
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 and click **Connect with Spotify**.

### 6. Synthetic data (ML dev)

```bash
export SUPABASE_URL=... SUPABASE_KEY=...
python scripts/generate_synthetic_data.py
```

## Project structure

```
backend/
  app/
    routes/     # auth, songs, ratings, collection, artists, ml
    services/   # spotify, supabase, elo, auth
    ml/         # predict, drift, embedding
frontend/
  src/
    pages/      # Dashboard, Collection, Artists, Rate, Insights
    components/
scripts/
  generate_synthetic_data.py
models/         # joblib artifacts per user
supabase/
  migrations/
notebooks/      # validate ML on synthetic data before integration
```

## Rating flow

1. Search Spotify catalog
2. Place song in **Fire** (670–1000), **Solid** (340–660), or **Skip** (0–330) bucket
3. Head-to-head comparisons within the same bucket (up to 3)
4. ELO updates with K=32; display score = ELO / 100

## ML endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /ml/predict-rating` | Predict score for unrated song |
| `GET /ml/taste-drift` | Change-point detection on audio features |
| `GET /ml/embedding` | UMAP + KMeans taste map |

All ML features require ≥20 rated songs.

## Build order (implemented)

1. Auth (Spotify OAuth + token refresh)
2. ELO rating flow
3. Collection UI
4. Artists & Albums aggregation
5. ML features (predict, drift, embedding)
