"""Generate synthetic data for local ML development."""
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

from supabase import create_client

NUM_SONGS = 200
USER_SPOTIFY_ID = "synthetic_dev_user"

FEATURE_RANGES = {
    "energy": (0, 1),
    "valence": (0, 1),
    "danceability": (0, 1),
    "tempo": (60, 200),
    "acousticness": (0, 1),
    "instrumentalness": (0, 1),
    "liveness": (0, 1),
    "speechiness": (0, 1),
    "loudness": (-20, 0),
}

ARTISTS = ["Neon Pulse", "Velvet Static", "Crystal Drift", "Iron Bloom", "Echo Harbor"]
ALBUMS = ["Midnight Signals", "Glass Frequency", "Soft Voltage", "Parallel Lines"]


def rand_features(energy_bias: float = 0.5) -> dict:
    return {
        "energy": max(0, min(1, random.gauss(energy_bias, 0.15))),
        "valence": random.uniform(0, 1),
        "danceability": random.uniform(0, 1),
        "tempo": random.uniform(60, 200),
        "acousticness": random.uniform(0, 1),
        "instrumentalness": random.uniform(0, 0.5),
        "liveness": random.uniform(0, 0.3),
        "speechiness": random.uniform(0, 0.3),
        "loudness": random.uniform(-20, 0),
    }


def features_to_elo(feats: dict, energy_weight: float) -> float:
    # Correlated ELO: higher energy preference → higher scores for high-energy tracks
    base = (
        feats["energy"] * energy_weight * 400
        + feats["valence"] * 200
        + feats["danceability"] * 150
        + random.gauss(200, 80)
    )
    return max(50, min(950, base))


def main():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    sb = create_client(url, key)

    user = sb.table("users").upsert({
        "spotify_id": USER_SPOTIFY_ID,
        "display_name": "Synthetic Dev",
        "email": "dev@forte.local",
    }, on_conflict="spotify_id").execute().data[0]

    user_id = user["id"]
    start = datetime.now(timezone.utc) - timedelta(days=180)

    songs = []
    for i in range(NUM_SONGS):
        songs.append({
            "spotify_id": f"synth_{i:04d}",
            "title": f"Track {i:04d}",
            "artist": random.choice(ARTISTS),
            "album": random.choice(ALBUMS),
            "album_art": None,
            "duration_ms": random.randint(120000, 300000),
            "spotify_popularity": random.randint(10, 90),
        })

    song_rows = sb.table("songs").upsert(songs, on_conflict="spotify_id").execute().data

    ratings = []
    for i, song in enumerate(song_rows):
        # Drift: energy preference decreases over 6 months
        progress = i / NUM_SONGS
        energy_bias = 0.7 - 0.3 * progress
        feats = rand_features(energy_bias)
        sb.table("songs").update({"audio_features": feats}).eq("id", song["id"]).execute()

        elo = features_to_elo(feats, energy_weight=0.5 + 0.5 * (1 - progress))
        bucket = "fire" if elo > 670 else "solid" if elo > 330 else "skip"
        rated_at = start + timedelta(days=int(progress * 180))

        ratings.append({
            "user_id": user_id,
            "song_id": song["id"],
            "elo": elo,
            "display_score": round(elo / 100, 1),
            "bucket": bucket,
            "comparison_count": random.randint(0, 3),
            "created_at": rated_at.isoformat(),
            "updated_at": rated_at.isoformat(),
        })

    sb.table("ratings").upsert(ratings, on_conflict="user_id,song_id").execute()
    print(f"Seeded {len(song_rows)} songs and {len(ratings)} ratings for user {user_id}")


if __name__ == "__main__":
    main()
