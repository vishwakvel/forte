import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Clock, ListMusic, Music, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { SongSearch } from './SongSearch';
import { NowPlaying } from './NowPlaying';
import { AlbumArt, Spinner } from './ui';
import { api, type Song } from '../lib/api';

interface Playlist {
  id: string;
  name: string;
  image: string | null;
  track_count: number;
}

interface Props {
  onSelect: (song: Song) => void;
}

export function SongBrowse({ onSelect }: Props) {
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<Song[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const rec = await api<Song[]>('/songs/recent');
      setRecent(rec);
    } catch {
      /* keep stale */
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api<string[]>('/songs/rated-ids'),
      api<Song[]>('/songs/recent'),
      api<Playlist[]>('/songs/playlists'),
    ])
      .then(([ids, rec, pls]) => {
        setRatedIds(new Set(ids));
        setRecent(rec);
        setPlaylists(pls);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onFocus = () => loadRecent();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(loadRecent, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [loadRecent]);

  function timeAgo(iso?: string) {
    if (!iso) return '';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const openPlaylist = async (pl: Playlist) => {
    setActivePlaylist(pl);
    setLoadingTracks(true);
    setPlaylistTracks([]);
    setTrackError(null);
    try {
      const tracks = await api<Song[]>(`/songs/playlists/${pl.id}/tracks`);
      setPlaylistTracks(tracks);
      if (tracks.length === 0) setTrackError('No playable tracks in this playlist');
    } catch (e) {
      setTrackError(e instanceof Error ? e.message : 'Failed to load tracks');
      setPlaylistTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  };

  const TrackRow = ({ song, dimmed }: { song: Song; dimmed?: boolean }) => (
    <button
      type="button"
      onClick={() => !dimmed && onSelect(song)}
      disabled={dimmed}
      className={clsx(
        'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition cursor-pointer shrink-0',
        dimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 group',
      )}
    >
      <AlbumArt src={song.album_art} alt={song.title} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={clsx('text-sm font-medium truncate', !dimmed && 'group-hover:text-accent')}>
          {song.title}
        </p>
        <p className="text-xs text-muted truncate">{song.artist}</p>
      </div>
      <span className="text-[10px] text-muted shrink-0 tabular-nums">
        {dimmed ? 'Rated' : timeAgo(song.played_at)}
      </span>
    </button>
  );

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <NowPlaying onSelect={onSelect} ratedIds={ratedIds} />
      <SongSearch onSelect={onSelect} placeholder="Search any track..." />

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
          <div className="glass rounded-2xl flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0">
              <Clock className="w-4 h-4 text-muted" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted flex-1">Recently Played</h3>
              <button
                type="button"
                onClick={loadRecent}
                disabled={loadingRecent}
                title="Refresh from Spotify"
                className="p-1 rounded-lg text-muted hover:text-text hover:bg-white/5 transition cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', loadingRecent && 'animate-spin')} />
              </button>
            </div>
            <p className="px-4 pb-2 text-[10px] text-muted/70 shrink-0">Synced from Spotify · may lag ~30 min</p>
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {recent.length === 0 ? (
                <p className="text-center text-muted text-xs py-8">Nothing recent yet</p>
              ) : (
                recent.map((s) => (
                  <TrackRow
                    key={`${s.spotify_id}-${s.played_at ?? 'x'}`}
                    song={s}
                    dimmed={ratedIds.has(s.spotify_id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="glass rounded-2xl flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0">
              {activePlaylist ? (
                <button
                  type="button"
                  onClick={() => { setActivePlaylist(null); setPlaylistTracks([]); setTrackError(null); }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-text transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Playlists
                </button>
              ) : (
                <>
                  <ListMusic className="w-4 h-4 text-muted" />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Your Playlists</h3>
                </>
              )}
              {activePlaylist && (
                <span className="text-xs text-text truncate ml-auto">{activePlaylist.name}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {activePlaylist ? (
                loadingTracks ? (
                  <div className="flex justify-center py-12"><Spinner /></div>
                ) : trackError ? (
                  <p className="text-center text-muted text-xs py-8">{trackError}</p>
                ) : (
                  playlistTracks.map((s) => (
                    <TrackRow key={s.spotify_id} song={s} dimmed={ratedIds.has(s.spotify_id)} />
                  ))
                )
              ) : playlists.length === 0 ? (
                <p className="text-center text-muted text-xs py-8">No playlists</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => openPlaylist(pl)}
                      className="rounded-xl p-2 text-left hover:bg-white/5 transition cursor-pointer group"
                    >
                      {pl.image ? (
                        <img
                          src={pl.image}
                          alt=""
                          className="w-full aspect-square rounded-lg object-cover mb-1.5 ring-1 ring-white/10 group-hover:ring-accent/30 transition"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-white/5 flex items-center justify-center mb-1.5">
                          <Music className="w-6 h-6 text-muted" />
                        </div>
                      )}
                      <p className="text-xs font-medium truncate group-hover:text-accent transition">{pl.name}</p>
                      <p className="text-[10px] text-muted">{pl.track_count} tracks</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
