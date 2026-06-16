# Forte

**Live app:** [music-taste-engine.vercel.app](https://music-taste-engine.vercel.app/)

Forte ranks your Spotify library the way you actually listen — not by play count, but by your own judgments. Bucket tracks, duel them head-to-head, and build real scores, rankings, and taste visualizations from your picks.

---

## Features

### Landing
Interactive vinyl hero on a scroll-gated landing page. The album stays closed until you tap it — that unlocks scroll and reveals the story, how-it-works cards, and the Connect with Spotify button. Bone/cream aesthetic throughout.

### Dashboard
Home base after login. Search any track to jump straight into rating, see library stats (total rated, average score, top artist/album), and browse your top-rated and recently rated songs.

### Rate
The core loop:
1. **Find a song** — search Spotify, pick from recently played (synced from your account), or drill into your playlists
2. **Bucket it** — first-impression placement into Fire, Solid, or Skip
3. **Duel it** — up to 3 head-to-head picks against other songs in the same bucket
4. **Lock in** — final ELO-derived score lands in your collection

Before you bucket, Forte shows an **estimated score** if you've rated enough similar songs. During duels, opponents are chosen to be as informative as possible, not random.

If a pick contradicts something you said earlier, Forte surfaces a **taste paradox** and lets you confirm the override — then recalculates the bucket.

### Collection
Full rated library with sortable columns (title, score, bucket, date added), bucket filters, and a detail modal per track. Manually edit any score (0–10); the bucket updates to match. Radar chart of Spotify audio features (energy, valence, danceability, etc.) when available.

### Rankings
Four tabs — **artists**, **albums**, **singles**, and **genres** — each ranked by your average display score across rated tracks. Singles are tracked separately from full albums. Click any entry to see every rated song in that group.

### Insights
Two visualizations, unlocked as your library grows:
- **3D taste map** — rotate and zoom a topographic surface of your taste; scrub a timeline to see how it looked on earlier dates
- **Genre brain** — force-directed graph of your top genres, sized by how much you've rated them and linked by similarity

---

## Rating pipeline

```
Search / pick song
       ↓
Fetch Spotify metadata + audio features + genres
       ↓
Bucket (Fire / Solid / Skip) → seed ELO at bucket midpoint
       ↓
Head-to-head duels (same bucket, compatible genres, max 3)
       ↓
ELO updates after each pick → display score = ELO ÷ 100
       ↓
Early stop if song has clearly hit floor/ceiling of bucket
       ↓
Score saved to collection
```

When a song is placed, Forte upserts it into the shared songs table with album art, duration, popularity, audio features, and inferred genres (from Spotify artist data, with MusicBrainz fallback during insight generation).

Comparisons only happen **within the same bucket** and between **genre-compatible** songs (at least one shared genre family, or unknown genre on either side).

---

## ELO scoring

Each song carries an internal **ELO** (0–1000) and a user-facing **display score** (0–10). Display score is simply `ELO / 100`, rounded to one decimal.

### Buckets

| Bucket | ELO range | Display range | Seed ELO (midpoint) |
|--------|-----------|---------------|---------------------|
| Fire | 670 – 1000 | 6.7 – 10.0 | 835 |
| Solid | 340 – 660 | 3.4 – 6.6 | 500 |
| Skip | 0 – 330 | 0.0 – 3.3 | 165 |

A new song starts at its bucket midpoint with maximum **rating deviation (RD = 350)** — meaning Forte is highly uncertain and will move the score aggressively.

### Update rule

Standard ELO with adaptive K:

```
expected(winner) = 1 / (1 + 10^((loser_elo - winner_elo) / 400))
expected(loser)  = 1 - expected(winner)

K = 32 × (winner_RD + loser_RD) / (2 × 350)

winner_elo += K × (1 - expected(winner))
loser_elo  += K × (0 - expected(loser))
```

After each comparison, both songs' RD decays by ×0.92 (floor 50). Higher RD → larger K → faster settling for new or volatile ratings.

### Opponent selection

Among unrated opponents in the same bucket (excluding already-duelled songs), Forte picks the one that **maximizes comparison entropy**:

```
H = -p·log(p) - (1-p)·log(1-p)    where p = expected_score(rated, opponent)
```

Entropy peaks when ELOs are close — those matchups carry the most information about where the new song belongs.

### Early stopping

Duels end before the 3-comparison cap when:
- The library has ≤1 other song in the bucket
- The rated song **lost** to the lowest-ELO song in the bucket (can't go lower)
- The rated song **beat** the highest-ELO song in the bucket (can't go higher)

### Volatility

After comparisons, each song's **ELO volatility** is the standard deviation of its ELO history across all past duels — a measure of how much that rating has swung.

### Manual edits

You can override any display score in Collection. Forte converts it back to ELO, reassigns the bucket if the score crosses a boundary, and bumps RD (+30) to reflect increased uncertainty.

### Bucket recompute

When you resolve a taste paradox, Forte **replays every comparison in that bucket chronologically** from bucket midpoints with adaptive K, then persists the resulting ELOs. This keeps the whole bucket internally consistent after dropping a conflicting edge.

---

## Taste paradox detection

Every comparison is stored as a directed edge: winner → loser. Before accepting a new pick, Forte checks for:

1. **Direct reversal** — you previously said B > A, but now pick A > B
2. **Cycle** — adding winner → loser closes a loop (A ≻ B ≻ C ≻ A)

If either is found, the API returns a paradox payload instead of applying the comparison. Confirming the pick drops the conflicting comparison(s) — the oldest edge in a cycle — and triggers a full bucket recompute.

---

## ML & taste modeling

Everything below is computed from **your ratings**, not Spotify play counts or popularity.

### Score prediction

**Unlock:** 20+ rated songs, and at least one similar match in your library.

For a target track, Forte scores similarity against every rated song (0 if no signal):

| Signal | Similarity weight |
|--------|-------------------|
| Same primary artist | 1.00 |
| Any shared artist | 0.85 |
| Same album | 0.65 |
| Genre overlap (Jaccard on artist genres from your top artists) | 0.35 + 0.5 × overlap |
| Duration within 90% | 0.25 |

The highest matching signal wins per pair (not additive). Songs with similarity > 0 enter a weighted pool:

```
predicted_ELO = Σ(sim × elo) / Σ(sim)
estimated score = round(predicted_ELO / 100, 1)
```

Shown on the Rate screen before you bucket.

### 3D taste map

**Unlock:** 10+ rated songs with enough genre data.

Each rated song is assigned a **genre family** (classical, jazz, folk, country, soul, r&b, hip hop, pop, rock, indie, metal, electronic, latin, reggae, other) via Spotify genres on the track or artist, normalized onto a fixed spectrum laid out left-to-right on the map floor.

Songs are grouped by genre, sorted by rating date, and split into **5 depth bands**:

| Band | Meaning |
|------|---------|
| early | First ~25% of ratings in that genre |
| growing | 25–55% |
| deep | 55–80% |
| core | Top 20% by recency in genre |

Each grid cell's **height (Y)** = average display score of songs in that genre × depth band. Empty cells are filled by interpolating from neighbors, then defaulting to 5.0.

**Axes in the 3D view:**
- **X** — genre position on the spectrum (both wings, rating pole at center)
- **Z** — library depth (early → core)
- **Y** — average score (height)

The timeline scrubber filters ratings to `created_at ≤ selected date` and rebuilds the surface — lets you watch taste evolve.

### Genre brain

**Unlock:** 5+ rated songs with identifiable genres.

Top 16 genre families by cumulative weight:

```
weight(genre) += display_score / 10    per song touching that genre
```

Node size = song count. Node avg score = weight / count × 10.

Edges connect genre pairs with similarity ≥ 0.3, using Jaccard on genre name tokens (with substring boost). Same parent family gets a minimum similarity of 0.55. Top 36 edges by strength are returned.

Rendered as an interactive force graph — drag nodes, pan, zoom.

---

## Spotify integration

- **OAuth 2.0** read-only scopes: profile, top artists, recently played, currently playing, private playlists
- **Recently played** panel refreshes on focus and every 60s (Spotify can lag ~30 min)
- **Playlist browse** with album art grids
- **Now playing** bar with one-click rate
- **Audio features** pulled at rating time for radar charts
- **Top artists + genres** seeded on login for genre inference when track-level genre is missing

Spotify tokens are stored server-side and refreshed automatically. The frontend never sees your Spotify credentials — only a Forte JWT after OAuth completes.

---

## Architecture

```
┌─────────────────────────┐     /api/* proxy      ┌──────────────────────────┐
│  Vercel (React SPA)     │ ────────────────────► │  Render (FastAPI)        │
│  music-taste-engine     │                       │  forte-syry.onrender.com │
└─────────────────────────┘                       └────────────┬─────────────┘
                                                                 │
              ┌──────────────────────────────────────────────────┼───────────────┐
              ▼                          ▼                         ▼               ▼
       Supabase (Postgres)        Spotify Web API          ML engine          Auth
       users · ratings ·         library · audio          predict            OAuth → JWT
       songs · comparisons        features · genres        embedding
                                                          genre graph
```

| Layer | Tech |
|-------|------|
| **Frontend** | React, TypeScript, Tailwind CSS, React Router, Recharts, custom WebGL/Canvas for 3D map and genre graph |
| **Backend** | FastAPI, Python |
| **Database** | Supabase (Postgres) |
| **Auth** | Spotify OAuth 2.0 → Forte JWT (30-day HS256 session) |
| **Deploy** | [Vercel](https://music-taste-engine.vercel.app/) (frontend) · Render (backend) |

The Vercel app proxies `/api/*` to Render so the browser stays same-origin. Spotify OAuth redirects through Render (`/auth/callback`), then back to the frontend with a session token.

---

## Data model

Postgres via Supabase:

| Table | Purpose |
|-------|---------|
| **users** | Spotify profile (display name, avatar, email) |
| **user_tokens** | Spotify access/refresh tokens with expiry |
| **songs** | Shared catalog — metadata, album art, audio features, genres, album type |
| **ratings** | Per-user ELO, display score, bucket, comparison count, RD, volatility |
| **comparisons** | Full duel history with ELO before/after snapshots |
| **user_top_artists** | Spotify top artists with genres and images, seeded on login |

Each user has at most one rating per song. Comparisons are immutable unless dropped during paradox resolution.

---

## Design

Bone/cream palette (`#eceae4`), Space Grotesk typography, sage green accents, glass-card UI with soft shadows — consistent from the vinyl landing page through every authenticated screen.

---

## Disclaimer

Forte is not affiliated with Spotify.
