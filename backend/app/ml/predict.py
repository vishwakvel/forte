"""Similarity-weighted rating prediction from your library."""
from app.config import settings
from app.services.artists import song_artists


def _genre_map(top_artists: list[dict]) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for a in top_artists:
        name = (a.get("name") or "").lower()
        if name:
            out[name] = {g.lower() for g in (a.get("genres") or [])}
    return out


def _similarity(
    target: dict,
    rated_song: dict,
    genre_by_artist: dict[str, set[str]],
) -> float:
    t_artists = [a.lower() for a in song_artists(target)]
    r_artists = [a.lower() for a in song_artists(rated_song)]
    if not t_artists or not r_artists:
        return 0.0

    score = 0.0
    if t_artists[0] == r_artists[0]:
        score = max(score, 1.0)
    if set(t_artists) & set(r_artists):
        score = max(score, 0.85)

    t_album = (target.get("album") or "").lower()
    r_album = (rated_song.get("album") or "").lower()
    if t_album and t_album == r_album:
        score = max(score, 0.65)

    t_genres: set[str] = set()
    r_genres: set[str] = set()
    for a in t_artists:
        t_genres |= genre_by_artist.get(a, set())
    for a in r_artists:
        r_genres |= genre_by_artist.get(a, set())
    if t_genres and r_genres:
        overlap = len(t_genres & r_genres) / len(t_genres | r_genres)
        score = max(score, 0.35 + 0.5 * overlap)

    # duration proximity (same ballpark)
    td, rd = target.get("duration_ms"), rated_song.get("duration_ms")
    if td and rd:
        ratio = min(td, rd) / max(td, rd)
        if ratio > 0.9:
            score = max(score, 0.25)

    return score


def predict_from_similar(
    target_song: dict,
    ratings: list[dict],
    top_artists: list[dict] | None = None,
) -> dict | None:
    if len(ratings) < settings.min_ratings_for_ml:
        return None

    genre_by_artist = _genre_map(top_artists or [])
    weighted: list[tuple[float, float]] = []

    for r in ratings:
        song = r.get("songs") or {}
        sim = _similarity(target_song, song, genre_by_artist)
        if sim > 0:
            weighted.append((sim, r["elo"]))

    if not weighted:
        return None

    total = sum(w for w, _ in weighted)
    pred_elo = sum(w * e for w, e in weighted) / total

    return {"predicted_score": round(pred_elo / 100, 1)}


if __name__ == "__main__":
    demo_ratings = [
        {
            "elo": 830,
            "songs": {"title": "Track A", "artist": "Artist", "album": "Album", "artists": ["Artist"]},
        },
        {
            "elo": 660,
            "songs": {"title": "Track B", "artist": "Artist", "album": "Other", "artists": ["Artist"]},
        },
    ]
    old_min = settings.min_ratings_for_ml
    settings.min_ratings_for_ml = 2
    try:
        demo = predict_from_similar(
            {"artist": "Artist", "album": "Album", "artists": ["Artist"]},
            demo_ratings,
        )
        assert demo and demo["predicted_score"] == 7.5
    finally:
        settings.min_ratings_for_ml = old_min
