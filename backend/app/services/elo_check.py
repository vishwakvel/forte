"""ponytail: assert-based self-check for ELO math."""
from app.services.elo import (
    bucket_midpoint,
    elo_to_display,
    expected_score,
    pick_opponent,
    should_stop_early,
    update_elo,
)

assert bucket_midpoint("fire") == 835
assert elo_to_display(500) == 5.0
w, l = update_elo(800, 200)
assert w > 800 and l < 200

ratings = [
    {"bucket": "fire", "song_id": "a", "elo": 700},
    {"bucket": "fire", "song_id": "b", "elo": 850},
    {"bucket": "fire", "song_id": "c", "elo": 950},
]
# first pick: closest to 835 → b
first = pick_opponent(ratings, "fire", {"new"}, rated_elo=835)
assert first["song_id"] == "b"
# won vs 850 → pick harder → c
after_win = pick_opponent(ratings, "fire", {"new", "b"}, rated_elo=870, last_won=True, last_opponent_elo=850)
assert after_win["song_id"] == "c"
# lost vs 700 (worst) → stop
assert should_stop_early(ratings + [{"song_id": "new", "elo": 650}], "new", False, 700)
print("elo self-check ok")
