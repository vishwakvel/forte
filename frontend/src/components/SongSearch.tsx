import { useEffect, useState } from 'react';
import { Search, Music } from 'lucide-react';
import { api, type Song } from '../lib/api';
import clsx from 'clsx';

interface Props {
  onSelect: (song: Song) => void;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
}

export function SongSearch({ onSelect, placeholder, autoFocus, large }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api<Song[]>(`/songs/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative w-full">
      <div className={clsx('relative group', large && 'max-w-2xl mx-auto')}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center">
          <Search className="absolute left-5 w-5 h-5 text-muted pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder ?? 'Search millions of tracks...'}
            autoFocus={autoFocus}
            className={clsx(
              'w-full pl-14 pr-5 bg-white/5 border border-white/10 rounded-2xl text-text placeholder:text-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all duration-200',
              large ? 'py-5 text-lg' : 'py-3.5 text-sm',
            )}
          />
          {loading && (
            <div className="absolute right-5 w-4 h-4 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
          )}
        </div>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 glass-strong rounded-2xl shadow-2xl overflow-hidden border border-white/10 max-h-80 overflow-y-auto">
          {results.map((s) => (
            <li key={s.spotify_id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s);
                  setQ('');
                  setResults([]);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition cursor-pointer text-left group"
              >
                {s.album_art ? (
                  <img src={s.album_art} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-accent/30 transition" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                    <Music className="w-5 h-5 text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate group-hover:text-accent transition">{s.title}</p>
                  <p className="text-sm text-muted truncate">{s.artist} · {s.album}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
