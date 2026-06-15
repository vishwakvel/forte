from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_current_user
from app.services import spotify as spotify_svc
from app.services.supabase import get_supabase, row

router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("/search")
async def search_songs(
    q: str = Query(..., min_length=1),
    user: dict = Depends(get_current_user),
):
    return await spotify_svc.spotify_search(user["id"], q)


@router.get("/playlists")
async def list_playlists(user: dict = Depends(get_current_user)):
    return await spotify_svc.fetch_playlists(user["id"])


@router.get("/playlists/{playlist_id}/tracks")
async def playlist_tracks(
    playlist_id: str,
    user: dict = Depends(get_current_user),
):
    return await spotify_svc.fetch_playlist_tracks(user["id"], playlist_id)


@router.get("/recent")
async def recent_tracks(user: dict = Depends(get_current_user)):
    return await spotify_svc.fetch_recently_played(user["id"])


@router.get("/rated-ids")
async def rated_spotify_ids(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("songs(spotify_id)")
        .eq("user_id", user["id"])
        .execute()
    )
    ids = []
    for r in res.data or []:
        sid = (r.get("songs") or {}).get("spotify_id")
        if sid:
            ids.append(sid)
    return ids


@router.get("/{song_id}")
async def get_song(song_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = sb.table("songs").select("*").eq("id", song_id).maybe_single().execute()
    data = row(res)
    if not data:
        raise HTTPException(404, "Song not found")
    return data
