"""ponytail: assert-based self-check for ELO math."""
import math

from app.services.elo import (
    bucket_midpoint,
    comparison_entropy,
    elo_to_display,
    pick_opponent,
    should_stop_early,
    update_elo,
)
from app.services.consistency import check_paradox, consistency_score

assert bucket_midpoint("fire") == 835
assert elo_to_display(500) == 5.0
w, l = update_elo(800, 200)
assert w > 800 and l < 200

ratings = [
    {"bucket": "fire", "song_id": "a", "elo": 700},
    {"bucket": "fire", "song_id": "b", "elo": 850},
    {"bucket": "fire", "song_id": "c", "elo": 950},
]
# entropy pick: closest elo to 835 → b
first = pick_opponent(ratings, "fire", {"new"}, rated_elo=835)
assert first["song_id"] == "b"
assert comparison_entropy(835, 850) > comparison_entropy(835, 950)

assert should_stop_early(ratings + [{"song_id": "new", "elo": 650}], "new", False, 700)

comps = [
    {"id": "1", "winner_song_id": "a", "loser_song_id": "b", "created_at": "2025-01-01"},
    {"id": "2", "winner_song_id": "b", "loser_song_id": "c", "created_at": "2025-01-02"},
    {"id": "3", "winner_song_id": "c", "loser_song_id": "a", "created_at": "2025-01-03"},
]
assert consistency_score(comps)["score"] < 1.0
paradox = check_paradox(comps[:2], "c", "a")
assert paradox and paradox["type"] == "cycle"

print("elo self-check ok")
