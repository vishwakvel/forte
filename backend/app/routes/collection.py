from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.services.artists import song_artists, song_has_artist
from app.services.genres import map_families_for_song
from app.services.supabase import get_supabase

router = APIRouter(prefix="/collection", tags=["collection"])


@router.get("")
async def get_collection(
    user: dict = Depends(get_current_user),
    bucket: str | None = None,
    artist: str | None = None,
    album: str | None = None,
    genre: str | None = None,
    sort_by: str = "elo",
    sort_dir: str = "desc",
):
    sb = get_supabase()
    q = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user["id"])
    )
    if bucket:
        q = q.eq("bucket", bucket)
    desc = sort_dir == "desc"
    q = q.order(sort_by, desc=desc)
    res = q.execute()
    rows = res.data or []

    if artist:
        rows = [r for r in rows if song_has_artist(r.get("songs") or {}, artist)]
    if album:
        rows = [r for r in rows if r.get("songs", {}).get("album", "").lower() == album.lower()]
    if genre:
        g = genre.lower().strip()
        rows = [r for r in rows if g in map_families_for_song(r.get("songs") or {})]

    return rows


@router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("elo, display_score, created_at, songs(artist, artists, album)")
        .eq("user_id", user["id"])
        .execute()
    )
    rows = res.data or []
    if not rows:
        return {
            "total": 0,
            "average_score": 0,
            "favorite_artist": None,
            "favorite_album": None,
        }

    avg = sum(r["display_score"] for r in rows) / len(rows)

    artist_scores: dict[str, list[float]] = {}
    album_scores: dict[str, list[float]] = {}
    for r in rows:
        song = r.get("songs") or {}
        al = song.get("album", "Unknown")
        for a in song_artists(song) or ["Unknown"]:
            artist_scores.setdefault(a, []).append(r["elo"])
        album_scores.setdefault(al, []).append(r["elo"])

    fav_artist = max(artist_scores, key=lambda k: sum(artist_scores[k]) / len(artist_scores[k]))
    fav_album = max(album_scores, key=lambda k: sum(album_scores[k]) / len(album_scores[k]))

    return {
        "total": len(rows),
        "average_score": round(avg, 1),
        "favorite_artist": fav_artist,
        "favorite_album": fav_album,
    }


@router.get("/top")
async def get_top(user: dict = Depends(get_current_user), limit: int = Query(10, le=50)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user["id"])
        .order("elo", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.get("/recent")
async def get_recent(user: dict = Depends(get_current_user), limit: int = Query(10, le=50)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("*, songs(*)")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []
