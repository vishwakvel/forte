# ML Notebooks

Validate ML features on synthetic data before relying on production ratings.

## Prerequisites

```bash
# Seed synthetic data
export SUPABASE_URL=... SUPABASE_KEY=...
python scripts/generate_synthetic_data.py

# Or work offline with generated arrays in notebooks
pip install jupyter scikit-learn umap-learn ruptures pandas
```

## Notebooks

1. **01_rating_prediction.ipynb** — GradientBoosting on audio features → ELO
2. **02_taste_drift.ipynb** — ruptures change-point detection on weekly feature averages
3. **03_taste_embedding.ipynb** — UMAP + KMeans clustering

Each notebook should use the same `FEATURE_KEYS` as `backend/app/ml/` and confirm signal exists before integration.

Integrated endpoints mirror notebook logic:

- `POST /ml/predict-rating`
- `GET /ml/taste-drift`
- `GET /ml/embedding`
