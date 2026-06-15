import base64
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings
from app.services.supabase import get_tokens, upsert_tokens

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API = "https://api.spotify.com/v1"

SCOPES = " ".join([
    "user-read-email",
    "user-read-private",
    "user-top-read",
    "user-read-recently-played",
    "user-read-currently-playing",
    "playlist-read-private",
    "playlist-read-collaborative",
])


def auth_url(state: str) -> str:
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": SCOPES,
        "state": state,
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{SPOTIFY_AUTH_URL}?{qs}"


async def exchange_code(code: str) -> dict:
    creds = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        res = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.spotify_redirect_uri,
            },
            headers={"Authorization": f"Basic {creds}"},
        )
        res.raise_for_status()
        return res.json()


async def refresh_access_token(refresh_token: str) -> dict:
    creds = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        res = await client.post(
            SPOTIFY_TOKEN_URL,
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
            headers={"Authorization": f"Basic {creds}"},
        )
        res.raise_for_status()
        return res.json()


async def get_valid_token(user_id: str) -> str:
    tokens = await get_tokens(user_id)
    if not tokens:
        raise ValueError("No tokens for user")

    expires = datetime.fromisoformat(tokens["expires_at"].replace("Z", "+00:00"))
    if expires > datetime.now(timezone.utc) + timedelta(minutes=1):
        return tokens["access_token"]

    data = await refresh_access_token(tokens["refresh_token"])
    new_expires = datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])
    await upsert_tokens(
        user_id,
        data["access_token"],
        data.get("refresh_token", tokens["refresh_token"]),
        new_expires.isoformat(),
    )
    return data["access_token"]


async def spotify_get(user_id: str, path: str, params: dict | None = None) -> dict:
    token = await get_valid_token(user_id)
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{SPOTIFY_API}{path}",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
        )
        if res.status_code == 204:
            return {}
        res.raise_for_status()
        return res.json()


def track_from_item(t: dict | None) -> dict | None:
    if not t or not t.get("id") or t.get("is_local"):
        return None
    if t.get("type") and t.get("type") != "track":
        return None
    names = [a["name"] for a in t.get("artists", [])]
    return {
        "spotify_id": t["id"],
        "title": t["name"],
        "artist": ", ".join(names),
        "artists": names,
        "album": t.get("album", {}).get("name"),
        "album_art": (
            t["album"]["images"][0]["url"]
            if t.get("album", {}).get("images")
            else None
        ),
        "duration_ms": t.get("duration_ms"),
        "spotify_popularity": t.get("popularity"),
        "album_type": (t.get("album") or {}).get("album_type"),
    }


async def spotify_search(user_id: str, q: str, limit: int = 10) -> list[dict]:
    data = await spotify_get(
        user_id, "/search", {"q": q, "type": "track", "limit": limit}
    )
    tracks = data.get("tracks", {}).get("items", [])
    return [s for t in tracks if (s := track_from_item(t))]


async def fetch_artist_genres_by_name(user_id: str, name: str) -> list[str]:
    try:
        data = await spotify_get(
            user_id, "/search", {"q": name, "type": "artist", "limit": 1}
        )
    except httpx.HTTPStatusError:
        return []
    items = data.get("artists", {}).get("items", [])
    if not items:
        return []
    return [g.lower() for g in (items[0].get("genres") or [])]


async def fetch_track_genres(user_id: str, spotify_id: str, artist_names: list[str] | None = None) -> list[str]:
    """Genres from track artists (Spotify has no per-track genre field)."""
    genres: list[str] = []
    try:
        track = await spotify_get(user_id, f"/tracks/{spotify_id}")
    except httpx.HTTPStatusError:
        track = {}
    artist_ids = [a["id"] for a in track.get("artists", []) if a.get("id")]
    if artist_ids:
        for i in range(0, len(artist_ids), 50):
            batch = ",".join(artist_ids[i : i + 50])
            try:
                data = await spotify_get(user_id, "/artists", {"ids": batch})
            except httpx.HTTPStatusError:
                continue
            for artist in data.get("artists") or []:
                genres.extend(artist.get("genres") or [])

    if not genres and artist_names:
        for name in artist_names[:3]:
            genres.extend(await fetch_artist_genres_by_name(user_id, name))

    if not genres and artist_names:
        from app.services.genre_infer import fetch_musicbrainz_genres
        mb = await fetch_musicbrainz_genres(artist_names[0])
        genres.extend(mb)

    seen: set[str] = set()
    out: list[str] = []
    for g in genres:
        gl = g.lower()
        if gl not in seen:
            seen.add(gl)
            out.append(gl)
    return out


async def fetch_audio_features(user_id: str, spotify_id: str) -> dict | None:
    try:
        data = await spotify_get(user_id, f"/audio-features/{spotify_id}")
    except httpx.HTTPStatusError:
        return None
    keys = [
        "energy", "valence", "danceability", "tempo",
        "acousticness", "instrumentalness", "liveness",
        "speechiness", "loudness",
    ]
    return {k: data.get(k) for k in keys}


async def fetch_top_artists(user_id: str, time_range: str) -> list[dict]:
    data = await spotify_get(
        user_id, "/me/top/artists", {"time_range": time_range, "limit": 50}
    )
    return [
        {
            "spotify_id": a["id"],
            "name": a["name"],
            "image_url": (a["images"][0]["url"] if a["images"] else None),
            "genres": a.get("genres", []),
            "time_range": time_range,
            "rank": i + 1,
        }
        for i, a in enumerate(data.get("items", []))
    ]


async def fetch_playlists(user_id: str, limit: int = 50) -> list[dict]:
    data = await spotify_get(user_id, "/me/playlists", {"limit": limit})
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "image": p["images"][0]["url"] if p.get("images") else None,
            "track_count": p.get("tracks", {}).get("total", 0),
        }
        for p in data.get("items", [])
    ]


async def fetch_playlist_tracks(user_id: str, playlist_id: str, limit: int = 200) -> list[dict]:
    seen: set[str] = set()
    tracks: list[dict] = []
    offset = 0
    page_size = min(50, limit)
    while len(tracks) < limit:
        data = await spotify_get(
            user_id,
            f"/playlists/{playlist_id}/items",
            {"limit": page_size, "offset": offset},
        )
        items = data.get("items") or []
        if not items:
            break
        for entry in items:
            raw = entry.get("item") or entry.get("track")
            song = track_from_item(raw)
            if song and song["spotify_id"] not in seen:
                seen.add(song["spotify_id"])
                tracks.append(song)
        if not data.get("next") or len(items) < page_size:
            break
        offset += page_size
    return tracks[:limit]


async def fetch_recently_played(user_id: str, limit: int = 50) -> list[dict]:
    data = await spotify_get(
        user_id, "/me/player/recently-played", {"limit": min(limit, 50)}
    )
    tracks: list[dict] = []
    for item in data.get("items", []):
        song = track_from_item(item.get("track"))
        if song:
            tracks.append({**song, "played_at": item.get("played_at")})
    return tracks


async def fetch_now_playing(user_id: str) -> dict | None:
    from datetime import datetime, timezone
    data = await spotify_get(user_id, "/me/player/currently-playing")
    item = data.get("item")
    if not item:
        return None
    song = track_from_item(item)
    if not song:
        return None
    return {
        **song,
        "played_at": datetime.now(timezone.utc).isoformat(),
    }
