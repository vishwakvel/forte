"""Feature vectors for ML embedding."""

AUDIO_KEYS = [
    "energy", "valence", "danceability", "tempo",
    "acousticness", "instrumentalness", "liveness",
    "speechiness", "loudness",
]

EMBED_FALLBACK_KEYS = ["duration_norm", "elo_norm", "popularity_norm"]


def _metadata_proxy(song: dict) -> dict:
    # ponytail: Spotify 403s /audio-features for many dev apps; proxies from duration/popularity
    dur = song.get("duration_ms") or 210_000
    pop = song.get("spotify_popularity")
    dur_norm = min(dur / 360_000.0, 1.0)
    pop_norm = (pop if pop is not None else 50) / 100.0
    return {
        "energy": pop_norm,
        "valence": 0.35 + 0.5 * dur_norm,
        "danceability": 1.0 - abs(dur_norm - 0.55),
        "tempo": 90 + 60 * pop_norm,
        "acousticness": max(0.0, 0.4 - pop_norm * 0.3),
        "instrumentalness": 0.05,
        "liveness": 0.1,
        "speechiness": 0.08 + pop_norm * 0.1,
        "loudness": -12 + pop_norm * 4,
        "duration_norm": dur_norm,
        "popularity_norm": pop_norm,
    }


def has_usable_features(rating: dict) -> bool:
    song = rating.get("songs") or {}
    if song.get("audio_features"):
        return True
    return song.get("duration_ms") is not None


def count_usable(ratings: list[dict]) -> int:
    return sum(1 for r in ratings if has_usable_features(r))


def embedding_pair(rating: dict) -> tuple[list[float], dict, list[str]] | None:
    """Returns (vector, meta, trait_key_order)."""
    song = rating.get("songs") or {}
    audio = song.get("audio_features")
    meta = {
        "song_id": rating["song_id"],
        "title": song.get("title"),
        "artist": song.get("artist"),
        "elo": rating["elo"],
        "bucket": rating["bucket"],
        "created_at": rating["created_at"],
    }
    if audio:
        return [audio.get(k, 0) for k in AUDIO_KEYS], meta, AUDIO_KEYS
    if song.get("duration_ms") is None:
        return None
    proxy = _metadata_proxy(song)
    keys = EMBED_FALLBACK_KEYS
    vec = [proxy["duration_norm"], rating["elo"] / 1000.0, proxy["popularity_norm"]]
    return vec, meta, keys
