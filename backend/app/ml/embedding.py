"""Genre × library-depth topographic surface (timeline filtered externally)."""
from __future__ import annotations

from collections import defaultdict

from app.services.genres import axis_x, family, map_family, map_layout_genres, primary_family


def _depth(yi: int, n: int) -> float:
    if n <= 1:
        return 0.0
    return round((yi / (n - 1)) * 2 - 1, 4)


def _exposure_label(zi: int, n_z: int) -> str:
    t = zi / max(n_z - 1, 1)
    if t < 0.25:
        return "early"
    if t < 0.55:
        return "growing"
    if t < 0.8:
        return "deep"
    return "core"


def compute_embedding(
    ratings: list[dict],
    before: str | None = None,
    top_artists: list[dict] | None = None,
) -> dict | None:
    filtered = sorted(ratings, key=lambda r: r["created_at"])
    if before:
        filtered = [r for r in filtered if r["created_at"] <= before]
    if len(filtered) < 10:
        return None

    artist_genre_map: dict[str, list[str]] = {}
    if top_artists:
        from app.services.artists import song_artists
        artist_genre_map = {
            (a.get("name") or "").lower(): [g.lower() for g in (a.get("genres") or [])]
            for a in (top_artists or [])
        }

    def _fam_for_rating(r: dict) -> str:
        song = r.get("songs") or {}
        fam = map_family(primary_family(song))
        if fam == "other" and artist_genre_map:
            from app.services.artists import song_artists
            for artist in song_artists(song):
                for g in artist_genre_map.get(artist.lower(), [])[:2]:
                    return map_family(family(g))
        return fam

    ordered = map_layout_genres()
    n_z = 5
    by_genre: dict[str, list[dict]] = defaultdict(list)
    for r in filtered:
        by_genre[_fam_for_rating(r)].append(r)

    cells: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for fam, songs in by_genre.items():
        songs_sorted = sorted(songs, key=lambda r: r["created_at"])
        n = len(songs_sorted)
        for idx, r in enumerate(songs_sorted):
            zi = min(n_z - 1, int(idx / max(n - 1, 1) * (n_z - 1)))
            cells[(fam, zi)].append(r)

    raw: list[list[dict | None]] = []
    for zi in range(n_z):
        row: list[dict | None] = []
        for fam in ordered:
            bucket = cells.get((fam, zi), [])
            if bucket:
                avg_score = sum(b["display_score"] for b in bucket) / len(bucket)
                row.append({
                    "x": round(axis_x(fam, ordered), 4),
                    "z": _depth(zi, n_z),
                    "y": round(max(0.0, min(10.0, avg_score)), 2),
                    "genre": fam,
                    "band": _exposure_label(zi, n_z),
                    "avg_score": round(avg_score, 1),
                    "certainty": round(min(len(bucket) / 5.0, 1.0), 2),
                    "count": len(bucket),
                })
            else:
                row.append(None)
        raw.append(row)

    surface: list[list[dict]] = []
    for zi, row in enumerate(raw):
        filled: list[dict] = []
        for gi, fam in enumerate(ordered):
            cell = row[gi]
            if cell:
                filled.append(cell)
                continue
            neighbors = []
            for dz, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nz, ng = zi + dz, gi + dx
                if 0 <= nz < len(raw) and 0 <= ng < len(ordered) and raw[nz][ng]:
                    neighbors.append(raw[nz][ng])
            if neighbors:
                avg_score = sum(n["avg_score"] for n in neighbors) / len(neighbors)
                filled.append({
                    "x": round(axis_x(fam, ordered), 4),
                    "z": _depth(zi, n_z),
                    "y": round(max(0.0, min(10.0, avg_score)), 2),
                    "genre": fam,
                    "band": "interpolated",
                    "avg_score": round(avg_score, 1),
                    "certainty": 0.15,
                    "count": 0,
                })
            else:
                filled.append({
                    "x": round(axis_x(fam, ordered), 4),
                    "z": _depth(zi, n_z),
                    "y": 5.0,
                    "genre": fam,
                    "band": "none",
                    "avg_score": 5.0,
                    "certainty": 0.05,
                    "count": 0,
                })
        surface.append(filled)

    timeline_dates = sorted({r["created_at"][:10] for r in ratings})

    return {
        "genre_labels": ordered,
        "surface": surface,
        "timeline_dates": timeline_dates,
    }
