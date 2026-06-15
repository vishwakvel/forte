from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.services.artists import song_artists
from app.services.supabase import get_supabase

router = APIRouter(prefix="/artists", tags=["artists"])


def _aggregate(rows: list[dict], key_fn) -> list[dict]:
    groups: dict[str, list] = {}
    for r in rows:
        song = r.get("songs") or {}
        for key in key_fn(song):
            if key:
                groups.setdefault(key, []).append({**r, "song": song})

    result = []
    for name, items in groups.items():
        avg = sum(i["display_score"] for i in items) / len(items)
        top = max(items, key=lambda i: i["elo"])
        result.append({
            "name": name,
            "avg_score": round(avg, 1),
            "song_count": len(items),
            "top_song": top.get("song"),
            "top_score": top["display_score"],
            "album_art": top.get("song", {}).get("album_art"),
        })
    result.sort(key=lambda x: x["avg_score"], reverse=True)
    return result


@router.get("")
async def list_artists(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("elo, display_score, songs(artist, artists, title, album_art)")
        .eq("user_id", user["id"])
        .execute()
    )
    return _aggregate(res.data or [], song_artists)


@router.get("/albums")
async def list_albums(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("elo, display_score, songs(album, artist, title, album_art)")
        .eq("user_id", user["id"])
        .execute()
    )
    return _aggregate(res.data or [], lambda s: [s.get("album")] if s.get("album") else [])
