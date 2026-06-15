import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import settings
from app.services import spotify as spotify_svc
from app.services.supabase import (
    get_supabase,
    upsert_tokens,
    upsert_user,
)

_oauth_states: dict[str, float] = {}


def create_state() -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = datetime.now(timezone.utc).timestamp()
    return state


def verify_state(state: str) -> bool:
    ts = _oauth_states.pop(state, None)
    if ts is None:
        return False
    return datetime.now(timezone.utc).timestamp() - ts < 600


def create_jwt(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=30)
    return jwt.encode(
        {"sub": user_id, "exp": exp},
        settings.jwt_secret,
        algorithm="HS256",
    )


async def handle_callback(code: str) -> tuple[dict, str]:
    token_data = await spotify_svc.exchange_code(code)
    access = token_data["access_token"]
    refresh = token_data["refresh_token"]
    expires = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])

    # Get profile with fresh token
    import httpx
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access}"},
        )
        res.raise_for_status()
        profile = res.json()

    user = await upsert_user({
        "spotify_id": profile["id"],
        "display_name": profile.get("display_name"),
        "email": profile.get("email"),
        "avatar_url": (profile["images"][0]["url"] if profile.get("images") else None),
    })

    await upsert_tokens(user["id"], access, refresh, expires.isoformat())
    await seed_top_data(user["id"])

    return user, create_jwt(user["id"])


async def seed_top_data(user_id: str):
    sb = get_supabase()
    for tr in ("short_term", "medium_term", "long_term"):
        artists = await spotify_svc.fetch_top_artists(user_id, tr)
        for a in artists:
            a["user_id"] = user_id
        if artists:
            sb.table("user_top_artists").upsert(
                artists, on_conflict="user_id,spotify_id,time_range"
            ).execute()
