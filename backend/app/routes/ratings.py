from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.deps import get_current_user
from app.services import spotify as spotify_svc
from app.services import elo as elo_svc
from app.services.supabase import get_supabase, row

router = APIRouter(prefix="/ratings", tags=["ratings"])

MAX_COMPARISONS = 3


class PlaceBucketRequest(BaseModel):
    spotify_id: str
    title: str
    artist: str
    album: str | None = None
    album_art: str | None = None
    duration_ms: int | None = None
    spotify_popularity: int | None = None
    artists: list[str] | None = None
    bucket: str


class CompareRequest(BaseModel):
    winner_song_id: str
    loser_song_id: str
    rated_song_id: str  # the song being settled (increments comparison_count)


def _rating_with_song(row: dict) -> dict:
    song = row.pop("songs", None) or {}
    return {**row, **{f"song_{k}": v for k, v in song.items() if k != "id"}, "song": song}


@router.post("/place")
async def place_in_bucket(req: PlaceBucketRequest, user: dict = Depends(get_current_user)):
    if req.bucket not in ("fire", "solid", "skip"):
        raise HTTPException(400, "Invalid bucket")

    sb = get_supabase()
    user_id = user["id"]

    # Upsert song
    audio = await spotify_svc.fetch_audio_features(user_id, req.spotify_id)
    names = req.artists or ([req.artist] if req.artist else [])
    song_row = {
        "spotify_id": req.spotify_id,
        "title": req.title,
        "artist": req.artist,
        "artists": names,
        "album": req.album,
        "album_art": req.album_art,
        "duration_ms": req.duration_ms,
        "spotify_popularity": req.spotify_popularity,
        "audio_features": audio,
    }
    song_res = sb.table("songs").upsert(song_row, on_conflict="spotify_id").execute()
    song = song_res.data[0]

    existing = (
        sb.table("ratings")
        .select("*")
        .eq("user_id", user_id)
        .eq("song_id", song["id"])
        .maybe_single()
        .execute()
    )
    if row(existing):
        raise HTTPException(409, "Song already rated")

    elo = elo_svc.bucket_midpoint(req.bucket)  # type: ignore
    rating = {
        "user_id": user_id,
        "song_id": song["id"],
        "elo": elo,
        "display_score": elo_svc.elo_to_display(elo),
        "bucket": req.bucket,
        "comparison_count": 0,
    }
    rating_res = sb.table("ratings").insert(rating).execute()
    created = rating_res.data[0]

    opponent = _find_opponent(sb, user_id, req.bucket, song["id"], elo)
    return {
        "rating": {**created, "song": song},
        "opponent": opponent,
        "comparisons_remaining": MAX_COMPARISONS,
    }


def _compared_opponent_ids(sb, user_id: str, rated_song_id: str) -> set[str]:
    res = (
        sb.table("comparisons")
        .select("winner_song_id, loser_song_id")
        .eq("user_id", user_id)
        .or_(f"winner_song_id.eq.{rated_song_id},loser_song_id.eq.{rated_song_id}")
        .execute()
    )
    ids: set[str] = set()
    for c in res.data or []:
        other = (
            c["loser_song_id"]
            if c["winner_song_id"] == rated_song_id
            else c["winner_song_id"]
        )
        ids.add(other)
    return ids


def _find_opponent(
    sb,
    user_id: str,
    bucket: str,
    rated_song_id: str,
    rated_elo: float,
    last_won: bool | None = None,
    last_opponent_elo: float | None = None,
) -> dict | None:
    exclude = {rated_song_id} | _compared_opponent_ids(sb, user_id, rated_song_id)
    res = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user_id)
        .eq("bucket", bucket)
        .execute()
    )
    ratings = res.data or []
    pick = elo_svc.pick_opponent(
        [{"bucket": r["bucket"], "song_id": r["song_id"], "elo": r["elo"]} for r in ratings],
        bucket,  # type: ignore
        exclude,
        rated_elo,
        last_won,
        last_opponent_elo,
    )
    if not pick:
        return None
    for r in ratings:
        if r["song_id"] == pick["song_id"]:
            return {"rating": r, "song": r["songs"]}
    return None


def _bucket_ratings(sb, user_id: str, bucket: str) -> list[dict]:
    res = (
        sb.table("ratings")
        .select("song_id, elo")
        .eq("user_id", user_id)
        .eq("bucket", bucket)
        .execute()
    )
    return res.data or []


@router.post("/compare")
async def compare(req: CompareRequest, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    user_id = user["id"]

    ratings_res = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user_id)
        .in_("song_id", [req.winner_song_id, req.loser_song_id])
        .execute()
    )
    by_song = {r["song_id"]: r for r in (ratings_res.data or [])}
    winner = by_song.get(req.winner_song_id)
    loser = by_song.get(req.loser_song_id)
    if not winner or not loser:
        raise HTTPException(404, "Rating not found")
    if winner["bucket"] != loser["bucket"]:
        raise HTTPException(400, "Songs must be in same bucket")

    w_before, l_before = winner["elo"], loser["elo"]
    w_after, l_after = elo_svc.update_elo(w_before, l_before)

    for r, elo in [(winner, w_after), (loser, l_after)]:
        update = {
            "elo": elo,
            "display_score": elo_svc.elo_to_display(elo),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if r["song_id"] == req.rated_song_id:
            update["comparison_count"] = r["comparison_count"] + 1
        sb.table("ratings").update(update).eq("id", r["id"]).execute()

    sb.table("comparisons").insert({
        "user_id": user_id,
        "winner_song_id": req.winner_song_id,
        "loser_song_id": req.loser_song_id,
        "winner_elo_before": w_before,
        "loser_elo_before": l_before,
        "winner_elo_after": w_after,
        "loser_elo_after": l_after,
    }).execute()

    # ponytail: retrain every 10 ratings (fire-and-forget)
    count_res = sb.table("ratings").select("id", count="exact").eq("user_id", user_id).execute()
    if (count_res.count or 0) % settings.retrain_every_n == 0:
        from app.ml import predict as predict_ml
        all_ratings = (
            sb.table("ratings").select("*, songs(*)").eq("user_id", user_id).execute().data or []
        )
        predict_ml.train(user_id, all_ratings)

    rated_won = req.winner_song_id == req.rated_song_id
    opp_elo_before = l_before if rated_won else w_before

    rated = by_song.get(req.rated_song_id)
    if not rated:
        raise HTTPException(404, "Rated song not found")

    new_count = rated["comparison_count"] + 1
    rated_new_elo = w_after if rated_won else l_after
    bucket_rows = _bucket_ratings(sb, user_id, rated["bucket"])

    stop = elo_svc.should_stop_early(
        bucket_rows, req.rated_song_id, rated_won, opp_elo_before
    )
    opponent = None
    remaining = 0
    if not stop and new_count < MAX_COMPARISONS:
        opponent = _find_opponent(
            sb, user_id, rated["bucket"], req.rated_song_id,
            rated_new_elo, rated_won, opp_elo_before,
        )
        if opponent:
            remaining = MAX_COMPARISONS - new_count

    return {
        "winner": {**winner, "elo": w_after, "display_score": elo_svc.elo_to_display(w_after)},
        "loser": {**loser, "elo": l_after, "display_score": elo_svc.elo_to_display(l_after)},
        "opponent": opponent,
        "comparisons_remaining": remaining,
    }


@router.get("/next-opponent/{song_id}")
async def next_opponent(song_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    rating = (
        sb.table("ratings")
        .select("*")
        .eq("user_id", user["id"])
        .eq("song_id", song_id)
        .maybe_single()
        .execute()
    )
    r = row(rating)
    if not r:
        raise HTTPException(404, "Rating not found")
    remaining = max(0, MAX_COMPARISONS - r["comparison_count"])
    rated_elo = r["elo"]
    opponent = (
        _find_opponent(sb, user["id"], r["bucket"], song_id, rated_elo)
        if remaining else None
    )
    return {"opponent": opponent, "comparisons_remaining": remaining}
