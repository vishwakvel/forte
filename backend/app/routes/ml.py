from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.config import settings
from app.deps import get_current_user
from app.ml import predict, embedding, genre_graph
from app.services import genres as genre_svc
from app.services.genre_infer import fetch_musicbrainz_genres
from app.services import spotify as spotify_svc
from app.services.supabase import get_supabase

router = APIRouter(prefix="/ml", tags=["ml"])


def _fetch_ratings(user_id: str) -> list[dict]:
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user_id)
        .execute()
    )
    return res.data or []


def _fetch_top_artists(user_id: str) -> list[dict]:
    sb = get_supabase()
    res = (
        sb.table("user_top_artists")
        .select("name, genres")
        .eq("user_id", user_id)
        .execute()
    )
    return res.data or []


async def _enrich_rating_genres(user_id: str, ratings: list[dict], limit: int = 20) -> None:
    """ponytail: Spotify often omits genres; MusicBrainz fills gaps (rate-limit ~1/s)."""
    sb = get_supabase()
    updated = 0
    for r in ratings:
        if updated >= limit:
            break
        song = r.get("songs") or {}
        if song.get("genres"):
            continue
        names = song.get("artists") or ([song.get("artist")] if song.get("artist") else [])
        raw = await spotify_svc.fetch_track_genres(user_id, song.get("spotify_id", ""), names)
        if not raw and song.get("artist"):
            raw = await fetch_musicbrainz_genres(song["artist"], song.get("title"))
        if not raw:
            continue
        primary = genre_svc.pick_primary_genre(raw)
        song["genres"] = raw
        song["primary_genre"] = primary
        try:
            sb.table("songs").update({"genres": raw, "primary_genre": primary}).eq("id", song["id"]).execute()
        except Exception:
            pass  # ponytail: migration 004 may not be applied yet
        updated += 1


def _unlock_message(ratings: list[dict]) -> str:
    total = len(ratings)
    if total < 10:
        return f"You've rated {total} songs — need at least 10 for the taste landscape."
    return "Not enough genre data yet — rate more songs or re-login to sync Spotify genres."


class PredictRequest(BaseModel):
    spotify_id: str
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    duration_ms: int | None = None
    spotify_popularity: int | None = None
    artists: list[str] | None = None


@router.post("/predict-rating")
async def predict_rating(req: PredictRequest, user: dict = Depends(get_current_user)):
    ratings = _fetch_ratings(user["id"])
    top_artists = _fetch_top_artists(user["id"])

    target = {
        "title": req.title,
        "artist": req.artist,
        "album": req.album,
        "duration_ms": req.duration_ms,
        "spotify_popularity": req.spotify_popularity,
        "artists": req.artists,
    }
    if not target.get("duration_ms"):
        try:
            track = await spotify_svc.spotify_get(user["id"], f"/tracks/{req.spotify_id}")
            target["duration_ms"] = track.get("duration_ms")
            target["spotify_popularity"] = track.get("popularity")
            if not target.get("title"):
                target["title"] = track.get("name")
            if not target.get("artist"):
                target["artist"] = ", ".join(
                    a["name"] for a in track.get("artists", [])
                )
            if not target.get("album"):
                target["album"] = (track.get("album") or {}).get("name")
            if not target.get("artists"):
                target["artists"] = [a["name"] for a in track.get("artists", [])]
        except Exception:
            pass

    result = predict.predict_from_similar(target, ratings, top_artists)
    if not result:
        return {"available": False, "message": "Rate more similar songs to unlock predictions"}
    return {"available": True, **result}


@router.get("/embedding")
async def taste_embedding(
    user: dict = Depends(get_current_user),
    before: str | None = Query(None),
):
    ratings = _fetch_ratings(user["id"])
    await _enrich_rating_genres(user["id"], ratings)
    top_artists = _fetch_top_artists(user["id"])
    result = embedding.compute_embedding(ratings, before=before, top_artists=top_artists)
    if not result:
        return {"available": False, "message": _unlock_message(ratings)}
    return {"available": True, **result}


@router.get("/genre-graph")
async def taste_genre_graph(user: dict = Depends(get_current_user)):
    ratings = _fetch_ratings(user["id"])
    await _enrich_rating_genres(user["id"], ratings)
    top_artists = _fetch_top_artists(user["id"])
    result = genre_graph.compute_genre_graph(ratings, top_artists)
    if not result:
        return {"available": False, "message": "Rate more songs to map your genres."}
    return {"available": True, **result}
