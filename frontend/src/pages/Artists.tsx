import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { AlbumArt, BucketBadge, GlassCard, PageHeader, ScoreBadge } from '../components/ui';
import { api, type Rating } from '../lib/api';

interface Aggregate {
  name: string;
  avg_score: number;
  song_count: number;
  top_song?: { title: string; artist: string };
  top_score: number;
  album_art?: string;
  image_url?: string;
  kind?: string;
}

type Tab = 'artists' | 'albums' | 'singles' | 'genres';

export function Artists() {
  const [artists, setArtists] = useState<Aggregate[]>([]);
  const [albums, setAlbums] = useState<Aggregate[]>([]);
  const [singles, setSingles] = useState<Aggregate[]>([]);
  const [genres, setGenres] = useState<Aggregate[]>([]);
  const [tab, setTab] = useState<Tab>('artists');
  const [detail, setDetail] = useState<{ name: string; tab: Tab } | null>(null);
  const [songs, setSongs] = useState<Rating[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  useEffect(() => {
    api<Aggregate[]>('/artists').then(setArtists).catch(() => {});
    api<Aggregate[]>('/artists/albums').then(setAlbums).catch(() => {});
    api<Aggregate[]>('/artists/singles').then(setSingles).catch(() => {});
    api<Aggregate[]>('/artists/genres').then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    if (!detail) {
      setSongs([]);
      return;
    }
    const params = new URLSearchParams({ sort_by: 'display_score', sort_dir: 'desc' });
    if (detail.tab === 'artists') params.set('artist', detail.name);
    else if (detail.tab === 'genres') params.set('genre', detail.name);
    else params.set('album', detail.name);
    setLoadingSongs(true);
    api<Rating[]>(`/collection?${params}`)
      .then(setSongs)
      .catch(() => setSongs([]))
      .finally(() => setLoadingSongs(false));
  }, [detail]);

  const items = tab === 'artists' ? artists
    : tab === 'albums' ? albums
      : tab === 'singles' ? singles
        : genres;

  const openDetail = (name: string) => setDetail({ name, tab });

  return (
    <div className="pb-16">
      <PageHeader
        title="Rankings"
        subtitle="Artists, albums, singles, and genres — ranked by your song ratings."
      />

      <div className="flex gap-2 mb-8 flex-wrap">
        {(['artists', 'albums', 'singles', 'genres'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              'px-5 py-2 rounded-full text-sm font-medium capitalize transition cursor-pointer border',
              tab === t
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'text-muted border-white/10 hover:border-white/20',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <GlassCard
            key={item.name}
            hover
            className="flex gap-4 !p-4"
            onClick={() => openDetail(item.name)}
          >
            <div className="relative shrink-0">
              {tab === 'genres' ? (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/25 to-primary/20 border border-white/10 flex items-center justify-center">
                  <span className="font-display text-lg font-semibold capitalize text-accent">
                    {item.name.slice(0, 2)}
                  </span>
                </div>
              ) : (
                <AlbumArt
                  src={tab === 'artists' ? (item.image_url || item.album_art) : item.album_art}
                  alt={item.name}
                  round={tab === 'artists'}
                />
              )}
              <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-bg border border-white/10 flex items-center justify-center text-xs font-display font-semibold text-muted">
                {i + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate capitalize">{item.name}</p>
              <p className="text-xs text-muted">
                {item.song_count} song{item.song_count !== 1 ? 's' : ''} rated
                {tab === 'singles' && ' · single'}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xs text-muted">avg</span>
                <ScoreBadge score={item.avg_score} size="sm" />
              </div>
              {item.top_song && (
                <p className="text-xs text-muted/70 mt-2 truncate">★ {item.top_song.title}</p>
              )}
            </div>
          </GlassCard>
        ))}
        {items.length === 0 && (
          <GlassCard className="col-span-full text-center !py-16 text-muted">
            {tab === 'singles'
              ? 'No singles rated yet — singles are tracked separately from full albums.'
              : tab === 'genres'
                ? 'Rate more songs to see your top genres.'
                : 'Rate more songs to see your rankings.'}
          </GlassCard>
        )}
      </div>

      {detail && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="glass rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col border border-white/10 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-white/8">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider capitalize">{detail.tab}</p>
                <h3 className="font-display text-xl font-semibold capitalize mt-1">{detail.name}</h3>
                <p className="text-sm text-muted mt-1">
                  {loadingSongs ? 'Loading…' : `${songs.length} rated song${songs.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-text cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {songs.map((r) => {
                const song = r.songs!;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                  >
                    <AlbumArt src={song.album_art} alt={song.title} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{song.title}</p>
                      <p className="text-xs text-muted truncate">{song.artist}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <ScoreBadge score={r.display_score} size="sm" />
                      <BucketBadge bucket={r.bucket} />
                    </div>
                  </div>
                );
              })}
              {!loadingSongs && songs.length === 0 && (
                <p className="text-center text-muted py-8 text-sm">No songs found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
