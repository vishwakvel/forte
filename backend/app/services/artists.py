"""Resolve artist names from a song row (uses artists[] when available)."""


def song_artists(song: dict) -> list[str]:
    if arr := song.get("artists"):
        return [a for a in arr if a]
    raw = song.get("artist") or ""
    return [raw] if raw else []


def song_has_artist(song: dict, name: str) -> bool:
    return name.lower() in (a.lower() for a in song_artists(song))
