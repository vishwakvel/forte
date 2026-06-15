"""Taste drift detection with ruptures."""
import numpy as np
import pandas as pd

FEATURE_KEYS = ["energy", "valence", "danceability"]


def detect_drift(ratings: list[dict]) -> dict | None:
    if len(ratings) < 20:
        return None

    rows = []
    for r in ratings:
        feats = (r.get("songs") or {}).get("audio_features")
        if not feats:
            continue
        rows.append({
            "created_at": r["created_at"],
            **{k: feats.get(k, 0) for k in FEATURE_KEYS},
        })
    if len(rows) < 20:
        return None

    df = pd.DataFrame(rows)
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.set_index("created_at").resample("W").mean().dropna()

    if len(df) < 4:
        return None

    try:
        import ruptures as rpt
    except ImportError:
        return None

    insights = []
    series_data = {}
    for feat in FEATURE_KEYS:
        signal = df[feat].values.reshape(-1, 1)
        algo = rpt.Pelt(model="rbf").fit(signal)
        bkps = algo.predict(pen=3)
        dates = df.index.tolist()
        change_points = [dates[min(b - 1, len(dates) - 1)].isoformat() for b in bkps[:-1]]
        series_data[feat] = {
            "dates": [d.isoformat() for d in dates],
            "values": df[feat].tolist(),
            "change_points": change_points,
        }
        if change_points:
            last_cp = change_points[-1]
            before = df[feat].iloc[: bkps[-2] if len(bkps) > 1 else len(df) // 2].mean()
            after = df[feat].iloc[bkps[-2] - 1 :].mean() if len(bkps) > 1 else df[feat].iloc[len(df) // 2 :].mean()
            direction = "higher" if after > before else "lower"
            insights.append(
                f"Your taste shifted toward {direction} {feat} tracks around {last_cp[:10]}"
            )

    return {"series": series_data, "insights": insights}
