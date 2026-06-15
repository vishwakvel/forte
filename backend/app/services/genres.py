"""Spotify genre normalization, ordering, and compatibility."""
from __future__ import annotations

# ponytail: curated spectrum — acoustic/organic left → electronic/aggressive right
GENRE_SPECTRUM = [
    "classical",
    "jazz",
    "folk",
    "country",
    "soul",
    "r&b",
    "hip hop",
    "rap",
    "trap",
    "pop",
    "rock",
    "indie",
    "metal",
    "punk",
    "electronic",
    "dance",
    "latin",
    "reggae",
    "other",
]

# Fixed taste-map columns — always laid out so the surface fills both wings
MAP_GENRES = [
    "classical",
    "jazz",
    "folk",
    "country",
    "soul",
    "r&b",
    "hip hop",
    "pop",
    "rock",
    "indie",
    "metal",
    "electronic",
    "latin",
    "reggae",
    "other",
]


def family(genre: str) -> str:
    g = (genre or "").lower().strip()
    if not g:
        return "other"
    for fam in GENRE_SPECTRUM:
        if fam == g or fam in g or g in fam:
            return fam
    if "hip" in g and "hop" in g:
        return "hip hop"
    if "r&b" in g or "rnb" in g or "rhythm and blues" in g:
        return "r&b"
    return g.split()[0] if g else "other"


def song_families(song: dict) -> set[str]:
    raw = song.get("genres") or []
    if not raw and song.get("primary_genre"):
        raw = [song["primary_genre"]]
    return {family(g) for g in raw if g}


def primary_family(song: dict) -> str:
    if song.get("primary_genre"):
        return family(song["primary_genre"])
    fams = song_families(song)
    if fams:
        return sorted(fams, key=lambda f: GENRE_SPECTRUM.index(f) if f in GENRE_SPECTRUM else 99)[0]
    return "other"


def genres_compatible(song_a: dict, song_b: dict) -> bool:
    fa, fb = song_families(song_a), song_families(song_b)
    if not fa or not fb:
        return True
    return bool(fa & fb)


def order_families(families: set[str]) -> list[str]:
    ordered = [f for f in GENRE_SPECTRUM if f in families]
    extras = sorted(families - set(ordered))
    return ordered + extras


def map_family(fam: str) -> str:
    f = (fam or "other").lower().strip()
    return f if f in MAP_GENRES else "other"


def map_families_for_song(song: dict) -> set[str]:
    fams = {map_family(f) for f in song_families(song)}
    return fams or {"other"}


def map_layout_genres() -> list[str]:
    return list(MAP_GENRES)


def axis_x(fam: str, ordered: list[str]) -> float:
    """Map genres to both wings of the floor — rating pole stays at x=0."""
    if fam not in ordered:
        return 0.0
    n = len(ordered)
    if n == 1:
        return 0.0
    i = ordered.index(fam)
    mid = (n + 1) // 2
    gap = 0.08  # keep a notch at center for the rating axis
    if i < mid:
        if mid == 1:
            return -0.55
        t = i / (mid - 1)
        return -1 + t * (1 - gap)
    right = n - mid
    j = i - mid
    if right == 1:
        return 0.55
    t = j / (right - 1)
    return gap + t * (1 - gap)


def pick_primary_genre(raw_genres: list[str]) -> str:
    if not raw_genres:
        return "other"
    fams = [family(g) for g in raw_genres]
    for fam in GENRE_SPECTRUM:
        if fam in fams:
            return fam
    return fams[0]
