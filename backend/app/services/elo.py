import math
from typing import Literal

Bucket = Literal["fire", "solid", "skip"]

BUCKETS: dict[Bucket, tuple[float, float]] = {
    "fire": (670, 1000),
    "solid": (340, 660),
    "skip": (0, 330),
}

K = 32
RD_MIN = 50.0
RD_MAX = 350.0
RD_DECAY = 0.92  # ponytail: Glicko-inspired; full Glicko-2 is the upgrade path


def bucket_midpoint(bucket: Bucket) -> float:
    lo, hi = BUCKETS[bucket]
    return (lo + hi) / 2


def elo_to_display(elo: float) -> float:
    return round(elo / 100, 1)


def display_to_elo(score: float) -> float:
    return score * 100


def expected_score(r_a: float, r_b: float) -> float:
    return 1 / (1 + 10 ** ((r_b - r_a) / 400))


def comparison_entropy(rated_elo: float, opp_elo: float) -> float:
    """H = -p log p - (1-p) log (1-p); max when elos are equal."""
    p = expected_score(rated_elo, opp_elo)
    if p <= 1e-9 or p >= 1 - 1e-9:
        return 0.0
    return -(p * math.log(p) + (1 - p) * math.log(1 - p))


def adaptive_k(w_rd: float, l_rd: float) -> float:
    """Higher RD (uncertainty) → larger K so volatile songs settle faster."""
    return K * ((w_rd + l_rd) / (2 * RD_MAX))


def decay_rd(rd: float) -> float:
    return max(RD_MIN, rd * RD_DECAY)


def update_elo(
    winner_elo: float,
    loser_elo: float,
    k: float | None = None,
) -> tuple[float, float]:
    k = k if k is not None else K
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
    """Pick the opponent that maximizes comparison entropy (most informative)."""
    candidates = [
        r for r in ratings
        if r["bucket"] == bucket and r["song_id"] not in exclude_song_ids
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda r: comparison_entropy(rated_elo, r["elo"]))


def elo_volatility_from_history(elo_history: list[float]) -> float:
    if len(elo_history) < 2:
        return 0.0
    mean = sum(elo_history) / len(elo_history)
    var = sum((e - mean) ** 2 for e in elo_history) / len(elo_history)
    return math.sqrt(var)


def recompute_bucket(
    ratings: list[dict],
    comparisons: list[dict],
    bucket: Bucket,
) -> dict[str, dict]:
    """Replay comparisons chronologically from bucket midpoints with adaptive K."""
    mid = bucket_midpoint(bucket)
    state: dict[str, dict] = {
        r["song_id"]: {
            "elo": mid,
            "rating_deviation": r.get("rating_deviation", RD_MAX),
            "elo_volatility": 0.0,
            "history": [mid],
        }
        for r in ratings
        if r["bucket"] == bucket
    }
    bucket_comps = sorted(
        [c for c in comparisons if c["winner_song_id"] in state and c["loser_song_id"] in state],
        key=lambda c: c["created_at"],
    )
    for c in bucket_comps:
        w, l = c["winner_song_id"], c["loser_song_id"]
        ws, ls = state[w], state[l]
        k = adaptive_k(ws["rating_deviation"], ls["rating_deviation"])
        new_w, new_l = update_elo(ws["elo"], ls["elo"], k)
        ws["elo"], ls["elo"] = new_w, new_l
        ws["history"].append(new_w)
        ls["history"].append(new_l)
        ws["rating_deviation"] = decay_rd(ws["rating_deviation"])
        ls["rating_deviation"] = decay_rd(ls["rating_deviation"])
    for sid, s in state.items():
        s["elo_volatility"] = elo_volatility_from_history(s["history"])
    return state
