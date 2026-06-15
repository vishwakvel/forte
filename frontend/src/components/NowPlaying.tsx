import { useCallback, useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import clsx from 'clsx';
import { AlbumArt, Spinner } from './ui';
import { api, type Song } from '../lib/api';

interface Props {
  onSelect: (song: Song) => void;
  ratedIds: Set<string>;
}

export function NowPlaying({ onSelect, ratedIds }: Props) {
  const [track, setTrack] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const t = await api<Song | null>('/songs/now-playing');
      setTrack(t);
    } catch {
      setTrack(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="shrink-0 h-20 glass rounded-2xl flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!track) return null;

  const rated = ratedIds.has(track.spotify_id);

  return (
    <div className="shrink-0 relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/8 via-white to-primary/5 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(34,197,94,0.12),transparent_60%)] pointer-events-none" />
      <div className="relative flex items-center gap-4 p-4">
        <div className="relative shrink-0">
          <AlbumArt src={track.album_art} alt={track.title} size="lg" className="ring-2 ring-accent/30" />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-accent items-center justify-center">
              <Radio className="w-2.5 h-2.5 text-white" />
            </span>
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-medium mb-1">Now Playing</p>
          <p className="font-display text-lg font-semibold truncate">{track.title}</p>
          <p className="text-sm text-muted truncate">{track.artist}</p>
        </div>
        <button
          type="button"
          disabled={rated}
          onClick={() => onSelect(track)}
          className={clsx(
            'shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer',
            rated
              ? 'bg-black/[0.04] text-muted cursor-not-allowed'
              : 'bg-accent text-white hover:scale-105 hover:bg-accent/90 glow-green',
          )}
        >
          {rated ? 'Rated' : 'Rate this'}
        </button>
      </div>
    </div>
  );
}
