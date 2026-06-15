from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.services.artists import song_artists
from app.services.genres import map_families_for_song
from app.services.supabase import get_supabase

router = APIRouter(prefix="/artists", tags=["artists"])


def _artist_images(sb, user_id: str) -> dict[str, str]:
    res = (
        sb.table("user_top_artists")
        .select("name, image_url")
        .eq("user_id", user_id)
        .execute()
    )
    return {
        (a.get("name") or "").lower(): a.get("image_url")
        for a in (res.data or [])
        if a.get("image_url")
    }


def _aggregate(rows: list[dict], key_fn, image_fn=None) -> list[dict]:
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
        entry = {
            "name": name,
            "avg_score": round(avg, 1),
            "song_count": len(items),
            "top_song": top.get("song"),
            "top_score": top["display_score"],
            "album_art": top.get("song", {}).get("album_art"),
        }
        if image_fn:
            entry["image_url"] = image_fn(name, top.get("song", {}))
        result.append(entry)
    result.sort(key=lambda x: x["avg_score"], reverse=True)
    return result


@router.get("")
async def list_artists(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    images = _artist_images(sb, user["id"])
    res = (
        sb.table("ratings")
        .select("elo, display_score, songs(artist, artists, title, album_art)")
        .eq("user_id", user["id"])
        .execute()
    )
    return _aggregate(
        res.data or [],
        song_artists,
        lambda name, _song: images.get(name.lower()) or images.get(name.split(",")[0].strip().lower()),
    )


def _album_keys(song: dict, singles: bool) -> list[str]:
    album = song.get("album")
    if not album:
        return []
    atype = (song.get("album_type") or "album").lower()
    is_single = atype == "single"
    if singles:
        return [album] if is_single else []
    return [] if is_single else [album]


@router.get("/albums")
async def list_albums(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("elo, display_score, songs(album, album_type, artist, title, album_art)")
        .eq("user_id", user["id"])
        .execute()
    )
    return _aggregate(res.data or [], lambda s: _album_keys(s, singles=False))


@router.get("/genres")
async def list_genres(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("display_score, songs(genres, primary_genre, title, artist, album_art)")
        .eq("user_id", user["id"])
        .execute()
    )
    groups: dict[str, list] = {}
    for r in res.data or []:
        song = r.get("songs") or {}
        for fam in map_families_for_song(song):
            groups.setdefault(fam, []).append({**r, "song": song})
    result = []
    for name, items in groups.items():
        avg = sum(i["display_score"] for i in items) / len(items)
        top = max(items, key=lambda i: i["display_score"])
        result.append({
            "name": name,
            "avg_score": round(avg, 1),
            "song_count": len(items),
            "top_song": top.get("song"),
            "top_score": top["display_score"],
            "album_art": top.get("song", {}).get("album_art"),
        })
    result.sort(key=lambda x: (x["avg_score"], x["song_count"]), reverse=True)
    return result


@router.get("/singles")
async def list_singles(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("ratings")
        .select("elo, display_score, songs(album, album_type, artist, title, album_art)")
        .eq("user_id", user["id"])
        .execute()
    )
    items = _aggregate(res.data or [], lambda s: _album_keys(s, singles=True))
    for item in items:
        item["kind"] = "single"
    return items
