"""Genre inference when Spotify artist genres are unavailable (restricted on many dev apps)."""
from __future__ import annotations

import httpx

from app.services.genres import family

MB = "https://musicbrainz.org/ws/2"
UA = "Forte/0.1 (https://github.com/forte-music)"


async def fetch_musicbrainz_genres(artist: str, title: str | None = None) -> list[str]:
    if not artist:
        return []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            if title:
                q = f'recording:"{title}" AND artist:"{artist}"'
                res = await client.get(
                    f"{MB}/recording",
                    params={"query": q, "fmt": "json", "limit": 1},
                    headers={"User-Agent": UA},
                )
                recs = res.json().get("recordings", [])
                if recs:
                    ac = recs[0].get("artist-credit") or []
                    if ac and ac[0].get("artist", {}).get("id"):
                        return await _artist_genres(client, ac[0]["artist"]["id"])

            res = await client.get(
                f"{MB}/artist",
                params={"query": f'artist:"{artist}"', "fmt": "json", "limit": 1},
                headers={"User-Agent": UA},
            )
            artists = res.json().get("artists", [])
            if not artists:
                return []
            return await _artist_genres(client, artists[0]["id"])
    except Exception:
        return []


async def _artist_genres(client: httpx.AsyncClient, artist_id: str) -> list[str]:
    res = await client.get(
        f"{MB}/artist/{artist_id}",
        params={"inc": "genres+tags", "fmt": "json"},
        headers={"User-Agent": UA},
    )
    data = res.json()
    raw = [g["name"].lower() for g in data.get("genres", [])]
    raw += [t["name"].lower() for t in (data.get("tags") or [])[:6]]
    seen: set[str] = set()
    out: list[str] = []
    for g in raw:
        if g not in seen:
            seen.add(g)
            out.append(g)
    return out[:8]


def families_from_raw(raw: list[str]) -> list[str]:
    return list(dict.fromkeys(family(g) for g in raw if g))
