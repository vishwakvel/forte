from supabase import create_client, Client

from app.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def row(res) -> dict | None:
    """ponytail: maybe_single().execute() returns None when no row."""
    return res.data if res else None


async def get_user_by_id(user_id: str) -> dict | None:
    sb = get_supabase()
    res = sb.table("users").select("*").eq("id", user_id).maybe_single().execute()
    return row(res)


async def get_user_by_spotify_id(spotify_id: str) -> dict | None:
    sb = get_supabase()
    res = (
        sb.table("users")
        .select("*")
        .eq("spotify_id", spotify_id)
        .maybe_single()
        .execute()
    )
    return row(res)


async def upsert_user(user: dict) -> dict:
    sb = get_supabase()
    res = (
        sb.table("users")
        .upsert(user, on_conflict="spotify_id")
        .execute()
    )
    return res.data[0]


async def upsert_tokens(user_id: str, access: str, refresh: str, expires_at: str):
    sb = get_supabase()
    sb.table("user_tokens").upsert(
        {
            "user_id": user_id,
            "access_token": access,
            "refresh_token": refresh,
            "expires_at": expires_at,
        },
        on_conflict="user_id",
    ).execute()


async def get_tokens(user_id: str) -> dict | None:
    sb = get_supabase()
    res = (
        sb.table("user_tokens")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return row(res)
