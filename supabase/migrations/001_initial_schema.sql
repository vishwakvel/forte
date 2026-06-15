-- Forte initial schema

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists user_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  title text not null,
  artist text not null,
  album text,
  album_art text,
  duration_ms int,
  spotify_popularity int,
  audio_features jsonb,
  created_at timestamptz default now()
);

create type bucket_type as enum ('fire', 'solid', 'skip');

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  elo float not null default 500,
  display_score float not null default 5.0,
  bucket bucket_type not null,
  comparison_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, song_id)
);

create table if not exists comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  winner_song_id uuid not null references songs(id),
  loser_song_id uuid not null references songs(id),
  winner_elo_before float not null,
  loser_elo_before float not null,
  winner_elo_after float not null,
  loser_elo_after float not null,
  created_at timestamptz default now()
);

create table if not exists user_top_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  spotify_id text not null,
  title text not null,
  artist text not null,
  album text,
  album_art text,
  time_range text not null check (time_range in ('short_term', 'medium_term', 'long_term')),
  rank int not null,
  created_at timestamptz default now(),
  unique (user_id, spotify_id, time_range)
);

create table if not exists user_top_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  spotify_id text not null,
  name text not null,
  image_url text,
  genres text[],
  time_range text not null check (time_range in ('short_term', 'medium_term', 'long_term')),
  rank int not null,
  created_at timestamptz default now(),
  unique (user_id, spotify_id, time_range)
);

create index if not exists idx_ratings_user_id on ratings(user_id);
create index if not exists idx_ratings_user_elo on ratings(user_id, elo desc);
create index if not exists idx_ratings_user_bucket on ratings(user_id, bucket);
create index if not exists idx_comparisons_user_id on comparisons(user_id);
create index if not exists idx_songs_artist on songs(artist);
create index if not exists idx_songs_album on songs(album);

alter table users enable row level security;
alter table user_tokens enable row level security;
alter table songs enable row level security;
alter table ratings enable row level security;
alter table comparisons enable row level security;
alter table user_top_tracks enable row level security;
alter table user_top_artists enable row level security;

-- ponytail: backend uses service_role key; RLS policies for future direct client access
create policy "users read own" on users for select using (true);
create policy "songs public read" on songs for select using (true);
create policy "ratings read own" on ratings for select using (true);
create policy "comparisons read own" on comparisons for select using (true);
