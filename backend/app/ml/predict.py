"""Rating prediction with GradientBoostingRegressor."""
import os
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score

from app.config import settings

FEATURE_KEYS = [
    "energy", "valence", "danceability", "tempo",
    "acousticness", "instrumentalness", "liveness",
    "speechiness", "loudness",
]
MODELS_DIR = Path(__file__).resolve().parents[2] / "models"


def _model_path(user_id: str) -> Path:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    return MODELS_DIR / f"predict_{user_id}.joblib"


def _to_matrix(ratings: list[dict]) -> tuple[np.ndarray, np.ndarray] | None:
    xs, ys = [], []
    for r in ratings:
        feats = (r.get("songs") or {}).get("audio_features")
        if not feats:
            continue
        row = [feats.get(k, 0) for k in FEATURE_KEYS]
        xs.append(row)
        ys.append(r["elo"])
    if len(xs) < settings.min_ratings_for_ml:
        return None
    return np.array(xs), np.array(ys)


def train(user_id: str, ratings: list[dict]) -> dict | None:
    data = _to_matrix(ratings)
    if data is None:
        return None
    X, y = data
    model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    scores = cross_val_score(model, X, y, cv=min(5, len(X) // 4), scoring="neg_mean_squared_error")
    model.fit(X, y)
    joblib.dump(model, _model_path(user_id))
    rmse = float(np.sqrt(-scores.mean()))
    return {"rmse": rmse, "n_samples": len(X)}


def predict(user_id: str, audio_features: dict) -> dict | None:
    path = _model_path(user_id)
    if not path.exists():
        return None
    model = joblib.load(path)
    x = np.array([[audio_features.get(k, 0) for k in FEATURE_KEYS]])
    pred_elo = float(model.predict(x)[0])
    # ponytail: rough CI from training residuals stored at train time would be better
    std = 50.0
    return {
        "predicted_elo": pred_elo,
        "predicted_score": round(pred_elo / 100, 1),
        "confidence_low": round(max(0, pred_elo - 1.96 * std) / 100, 1),
        "confidence_high": round(min(1000, pred_elo + 1.96 * std) / 100, 1),
    }
