from typing import Literal

Bucket = Literal["fire", "solid", "skip"]

BUCKETS: dict[Bucket, tuple[float, float]] = {
    "fire": (670, 1000),
    "solid": (340, 660),
    "skip": (0, 330),
}

K = 32


def bucket_midpoint(bucket: Bucket) -> float:
    lo, hi = BUCKETS[bucket]
    return (lo + hi) / 2


def elo_to_display(elo: float) -> float:
    return round(elo / 100, 1)


def display_to_elo(score: float) -> float:
    return score * 100


def expected_score(r_a: float, r_b: float) -> float:
    return 1 / (1 + 10 ** ((r_b - r_a) / 400))


def update_elo(winner_elo: float, loser_elo: float, k: int = K) -> tuple[float, float]:
    e_w = expected_score(winner_elo, loser_elo)
    e_l = expected_score(loser_elo, winner_elo)
    new_w = winner_elo + k * (1 - e_w)
    new_l = loser_elo + k * (0 - e_l)
    return new_w, new_l


def should_stop_early(
    ratings: list[dict],
    rated_song_id: str,
    rated_won: bool,
    opponent_elo: float,
) -> bool:
    """Stop when rank is pinned: lost to bucket's worst or beat bucket's best."""
    others = [r for r in ratings if r["song_id"] != rated_song_id]
    if len(others) <= 1:
        return True
    min_elo = min(r["elo"] for r in others)
    max_elo = max(r["elo"] for r in others)
    if not rated_won and opponent_elo <= min_elo:
        return True
    if rated_won and opponent_elo >= max_elo:
        return True
    return False


def pick_opponent(
    ratings: list[dict],
    bucket: Bucket,
    exclude_song_ids: set[str],
    rated_elo: float,
    last_won: bool | None = None,
    last_opponent_elo: float | None = None,
) -> dict | None:
    """Adaptive pairing: after a win pick higher elo; after a loss pick lower."""
    candidates = [
        r for r in ratings
        if r["bucket"] == bucket and r["song_id"] not in exclude_song_ids
    ]
    if not candidates:
        return None

    if last_won is None:
        return min(candidates, key=lambda r: abs(r["elo"] - rated_elo))

    if last_won and last_opponent_elo is not None:
        harder = [r for r in candidates if r["elo"] > last_opponent_elo]
        return min(harder, key=lambda r: r["elo"]) if harder else None

    if last_won is False and last_opponent_elo is not None:
        easier = [r for r in candidates if r["elo"] < last_opponent_elo]
        return max(easier, key=lambda r: r["elo"]) if easier else None

    return None
