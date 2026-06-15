"""UMAP embedding + KMeans clustering."""
import numpy as np
from sklearn.cluster import KMeans

FEATURE_KEYS = [
    "energy", "valence", "danceability", "tempo",
    "acousticness", "instrumentalness", "liveness",
    "speechiness", "loudness",
]

TRAIT_LABELS = {
    "energy": "energetic",
    "valence": "upbeat",
    "danceability": "danceable",
    "acousticness": "acoustic",
    "instrumentalness": "instrumental",
    "speechiness": "lyrical",
}


def _feature_matrix(ratings: list[dict]) -> tuple[np.ndarray, list[dict]] | None:
    xs, meta = [], []
    for r in ratings:
        feats = (r.get("songs") or {}).get("audio_features")
        song = r.get("songs") or {}
        if not feats:
            continue
        xs.append([feats.get(k, 0) for k in FEATURE_KEYS])
        meta.append({
            "song_id": r["song_id"],
            "title": song.get("title"),
            "artist": song.get("artist"),
            "elo": r["elo"],
            "bucket": r["bucket"],
            "created_at": r["created_at"],
        })
    if len(xs) < 20:
        return None
    return np.array(xs), meta


def _pick_k(X: np.ndarray) -> int:
    # ponytail: elbow via inertia drop; cap k at 5
    best_k, best_drop = 3, 0.0
    inertias = []
    for k in range(2, 6):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(X)
        inertias.append(km.inertia_)
    for i in range(1, len(inertias)):
        drop = inertias[i - 1] - inertias[i]
        if drop > best_drop:
            best_drop = drop
            best_k = i + 2
    return min(best_k, 5)


def compute_embedding(ratings: list[dict], before: str | None = None) -> dict | None:
    filtered = ratings
    if before:
        filtered = [r for r in ratings if r["created_at"] <= before]
    data = _feature_matrix(filtered)
    if data is None:
        return None
    X, meta = data

    try:
        import umap
        reducer = umap.UMAP(n_components=2, random_state=42, n_neighbors=min(15, len(X) - 1))
        coords = reducer.fit_transform(X)
    except Exception:
        from sklearn.decomposition import PCA
        coords = PCA(n_components=2, random_state=42).fit_transform(X)

    k = _pick_k(X)
    labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(X)

    cluster_traits = {}
    for c in range(k):
        mask = labels == c
        centroid = X[mask].mean(axis=0)
        top_idx = np.argsort(centroid)[-2:][::-1]
        traits = [TRAIT_LABELS.get(FEATURE_KEYS[i], FEATURE_KEYS[i]) for i in top_idx]
        cluster_traits[str(c)] = traits

    points = []
    for i, m in enumerate(meta):
        points.append({
            **m,
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "cluster": int(labels[i]),
            "cluster_label": ", ".join(cluster_traits.get(str(labels[i]), [])),
        })

    timeline_dates = sorted({r["created_at"][:10] for r in ratings})

    return {
        "points": points,
        "clusters": cluster_traits,
        "timeline_dates": timeline_dates,
        "n_clusters": k,
    }
