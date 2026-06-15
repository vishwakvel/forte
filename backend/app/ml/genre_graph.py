"""Genre graph for taste-brain visualization."""
from __future__ import annotations

from collections import defaultdict

from app.services.genres import family, order_families, primary_family, song_families


def _genre_similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0
    wa, wb = set(a.lower().split()), set(b.lower().split())
    if not wa or not wb:
        return 0.0
    jaccard = len(wa & wb) / len(wa | wb)
    if a in b or b in a:
        jaccard = max(jaccard, 0.65)
    return jaccard


def compute_genre_graph(
    ratings: list[dict],
    top_artists: list[dict] | None = None,
) -> dict | None:
    if len(ratings) < 5:
        return None

    genre_weight: dict[str, float] = defaultdict(float)
    genre_songs: dict[str, int] = defaultdict(int)

    for r in ratings:
        song = r.get("songs") or {}
        w = r["display_score"] / 10.0
        fams = song_families(song)
        if not fams or fams == {"other"}:
            if top_artists:
                from app.services.artists import song_artists
                ag: dict[str, list[str]] = {
                    (a.get("name") or "").lower(): [g.lower() for g in (a.get("genres") or [])]
                    for a in top_artists
                }
                for artist in song_artists(song):
                    for g in ag.get(artist.lower(), [])[:3]:
                        fams.add(family(g))
        if not fams:
            fams = {primary_family(song)}
        if fams == {"other"}:
            continue
        for g in fams:
            genre_weight[g] += w
            genre_songs[g] += 1

    if not genre_weight:
        return None

    ranked = sorted(genre_weight.items(), key=lambda x: -x[1])[:16]
    nodes = []
    for genre, weight in ranked:
        nodes.append({
            "id": genre,
            "label": genre,
            "size": genre_songs[genre],
            "weight": round(weight, 2),
            "avg_score": round(weight / max(genre_songs[genre], 1) * 10, 1),
            "parent": family(genre),
            "is_artist_fallback": False,
        })

    edges = []
    seen: set[tuple[str, str]] = set()
    for i, a in enumerate(nodes):
        for b in nodes[i + 1:]:
            sim = _genre_similarity(a["id"], b["id"])
            if a["parent"] == b["parent"]:
                sim = max(sim, 0.55)
            if sim >= 0.3:
                key = tuple(sorted((a["id"], b["id"])))
                if key not in seen:
                    seen.add(key)
                    edges.append({"source": a["id"], "target": b["id"], "strength": round(sim, 2)})
    edges.sort(key=lambda e: -e["strength"])
    edges = edges[:36]

    return {
        "nodes": nodes,
        "edges": edges,
        "parents": order_families({n["parent"] for n in nodes}),
        "total_genres": len(nodes),
    }
