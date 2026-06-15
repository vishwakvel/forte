from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.deps import get_current_user
from app.services import spotify as spotify_svc
from app.services import elo as elo_svc
from app.services import consistency as consistency_svc
from app.services import genres as genre_svc
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
    rated_song_id: str
    confirm_paradox: bool = False


class UpdateScoreRequest(BaseModel):
    display_score: float


def _user_comparisons(sb, user_id: str) -> list[dict]:
    res = (
        sb.table("comparisons")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return res.data or []


def _persist_bucket_state(sb, user_id: str, bucket: str, state: dict[str, dict]):
    for song_id, s in state.items():
        sb.table("ratings").update({
            "elo": s["elo"],
            "display_score": elo_svc.elo_to_display(s["elo"]),
            "rating_deviation": s["rating_deviation"],
            "elo_volatility": s["elo_volatility"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).eq("song_id", song_id).execute()


def _song_lookup(sb, song_ids: list[str]) -> dict[str, dict]:
    if not song_ids:
        return {}
    res = sb.table("songs").select("id, title, artist").in_("id", song_ids).execute()
    return {s["id"]: s for s in (res.data or [])}


def _paradox_payload(paradox: dict, songs: dict[str, dict]) -> dict:
    chain = paradox["chain"]
    labels = [
        songs.get(sid, {}).get("title") or "Unknown"
        for sid in chain
    ]
    if paradox["type"] == "reversal":
        msg = (
            f"You previously rated {labels[1]} above {labels[0]}, "
            f"but just picked {labels[0]} over {labels[1]}."
        )
    else:
        msg = " → ".join(labels) + " forms a taste paradox (cycle)."
    return {
        "paradox": True,
        "type": paradox["type"],
        "message": msg,
        "chain": [
            {"song_id": sid, "title": songs.get(sid, {}).get("title"), "artist": songs.get(sid, {}).get("artist")}
            for sid in chain
        ],
    }


@router.post("/place")
async def place_in_bucket(req: PlaceBucketRequest, user: dict = Depends(get_current_user)):
    if req.bucket not in ("fire", "solid", "skip"):
        raise HTTPException(400, "Invalid bucket")

    sb = get_supabase()
    user_id = user["id"]
    names = req.artists or ([req.artist] if req.artist else [])

    audio = await spotify_svc.fetch_audio_features(user_id, req.spotify_id)
    raw_genres = await spotify_svc.fetch_track_genres(user_id, req.spotify_id, names)
    primary = genre_svc.pick_primary_genre(raw_genres)
    album_type = None
    try:
        track = await spotify_svc.spotify_get(user_id, f"/tracks/{req.spotify_id}")
        album_type = (track.get("album") or {}).get("album_type")
    except Exception:
        pass
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
        "genres": raw_genres,
        "primary_genre": primary,
        "album_type": album_type,
    }
    try:
        song_res = sb.table("songs").upsert(song_row, on_conflict="spotify_id").execute()
    except Exception:
        song_row.pop("genres", None)
        song_row.pop("primary_genre", None)
        song_row.pop("album_type", None)
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
        "rating_deviation": elo_svc.RD_MAX,
        "elo_volatility": 0,
    }
    rating_res = sb.table("ratings").insert(rating).execute()
    created = rating_res.data[0]

    opponent = _find_opponent(sb, user_id, req.bucket, song["id"], elo, song)
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
    rated_song: dict | None = None,
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
    pool = []
    for r in ratings:
        if r["song_id"] in exclude:
            continue
        if rated_song and not genre_svc.genres_compatible(rated_song, r.get("songs") or {}):
            continue
        pool.append({"bucket": r["bucket"], "song_id": r["song_id"], "elo": r["elo"]})
    pick = elo_svc.pick_opponent(pool, bucket, set(), rated_elo)  # type: ignore
    if not pick:
        return None
    for r in ratings:
        if r["song_id"] == pick["song_id"]:
            return {"rating": r, "song": r["songs"]}
    return None


def _bucket_ratings(sb, user_id: str, bucket: str) -> list[dict]:
    res = (
        sb.table("ratings")
        .select("song_id, elo, bucket, rating_deviation")
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
    if not genre_svc.genres_compatible(winner.get("songs") or {}, loser.get("songs") or {}):
        raise HTTPException(400, "Songs must be in a compatible genre for comparison")

    comparisons = _user_comparisons(sb, user_id)
    paradox = consistency_svc.check_paradox(comparisons, req.winner_song_id, req.loser_song_id)
    if paradox and not req.confirm_paradox:
        ids = list({n for n in paradox["chain"]} | {req.winner_song_id, req.loser_song_id})
        songs = _song_lookup(sb, ids)
        return _paradox_payload(paradox, songs)

    if paradox and req.confirm_paradox:
        for cid in consistency_svc.comparisons_to_drop(
            comparisons, req.winner_song_id, req.loser_song_id, paradox
        ):
            sb.table("comparisons").delete().eq("id", cid).execute()
        comparisons = _user_comparisons(sb, user_id)

    w_before, l_before = winner["elo"], loser["elo"]
    w_rd = winner.get("rating_deviation", elo_svc.RD_MAX)
    l_rd = loser.get("rating_deviation", elo_svc.RD_MAX)
    k = elo_svc.adaptive_k(w_rd, l_rd)
    w_after, l_after = elo_svc.update_elo(w_before, l_before, k)

    for r, elo, rd in [
        (winner, w_after, elo_svc.decay_rd(w_rd)),
        (loser, l_after, elo_svc.decay_rd(l_rd)),
    ]:
        update = {
            "elo": elo,
            "display_score": elo_svc.elo_to_display(elo),
            "rating_deviation": rd,
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

    # Recompute bucket for global consistency after paradox resolution
    if paradox and req.confirm_paradox:
        bucket = winner["bucket"]
        all_ratings = _bucket_ratings(sb, user_id, bucket)
        all_comps = _user_comparisons(sb, user_id)
        state = elo_svc.recompute_bucket(all_ratings, all_comps, bucket)  # type: ignore
        _persist_bucket_state(sb, user_id, bucket, state)
        w_after = state[req.winner_song_id]["elo"]
        l_after = state[req.loser_song_id]["elo"]

    rated_won = req.winner_song_id == req.rated_song_id
    opp_elo_before = l_before if rated_won else w_before

    rated = by_song.get(req.rated_song_id)
    if not rated:
        raise HTTPException(404, "Rated song not found")

    # refresh volatility from comparison history
    _update_volatility(sb, user_id, [req.winner_song_id, req.loser_song_id])

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
            sb, user_id, rated["bucket"], req.rated_song_id, rated_new_elo,
            rated.get("songs") or {},
        )
        if opponent:
            remaining = MAX_COMPARISONS - new_count

    return {
        "paradox": False,
        "winner": {**winner, "elo": w_after, "display_score": elo_svc.elo_to_display(w_after)},
        "loser": {**loser, "elo": l_after, "display_score": elo_svc.elo_to_display(l_after)},
        "opponent": opponent,
        "comparisons_remaining": remaining,
    }


def _update_volatility(sb, user_id: str, song_ids: list[str]):
    comps = _user_comparisons(sb, user_id)
    for sid in song_ids:
        history = []
        for c in comps:
            if c["winner_song_id"] == sid:
                history.append(c["winner_elo_after"])
            elif c["loser_song_id"] == sid:
                history.append(c["loser_elo_after"])
        vol = elo_svc.elo_volatility_from_history(history)
        sb.table("ratings").update({"elo_volatility": vol}).eq("user_id", user_id).eq("song_id", sid).execute()


@router.patch("/{song_id}/score")
async def update_score(
    song_id: str,
    req: UpdateScoreRequest,
    user: dict = Depends(get_current_user),
):
    if not 0 <= req.display_score <= 10:
        raise HTTPException(400, "Score must be between 0 and 10")

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

    elo = elo_svc.display_to_elo(req.display_score)
    bucket = r["bucket"]
    if elo >= 670:
        bucket = "fire"
    elif elo >= 340:
        bucket = "solid"
    else:
        bucket = "skip"

    sb.table("ratings").update({
        "elo": elo,
        "display_score": round(req.display_score, 1),
        "bucket": bucket,
        "rating_deviation": min(elo_svc.RD_MAX, (r.get("rating_deviation") or 200) + 30),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", r["id"]).execute()

    updated = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("id", r["id"])
        .maybe_single()
        .execute()
    )
    return row(updated)
