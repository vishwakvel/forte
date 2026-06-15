import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AlbumArt, GlassCard, PageHeader, ScoreBadge } from '../components/ui';
import { api } from '../lib/api';

interface Aggregate {
  name: string;
  avg_score: number;
  song_count: number;
  top_song?: { title: string; artist: string };
  top_score: number;
  album_art?: string;
}

export function Artists() {
  const [artists, setArtists] = useState<Aggregate[]>([]);
  const [albums, setAlbums] = useState<Aggregate[]>([]);
  const [tab, setTab] = useState<'artists' | 'albums'>('artists');

  useEffect(() => {
    api<Aggregate[]>('/artists').then(setArtists).catch(() => {});
    api<Aggregate[]>('/artists/albums').then(setAlbums).catch(() => {});
  }, []);

  const items = tab === 'artists' ? artists : albums;

  return (
    <div>
      <PageHeader
        title="Artists & Albums"
        subtitle="Ranked by your actual song ratings — not streams."
      />

      <div className="flex gap-2 mb-8">
        {(['artists', 'albums'] as const).map((t) => (
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
          <GlassCard key={item.name} hover className="flex gap-4 !p-4">
            <div className="relative">
              <AlbumArt src={item.album_art} alt={item.name} />
              <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-bg border border-white/10 flex items-center justify-center text-xs font-display font-semibold text-muted">
                {i + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted">{item.song_count} songs rated</p>
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
            Rate more songs to see your artist and album rankings.
          </GlassCard>
        )}
      </div>
    </div>
  );
}
