import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Flame, ThumbsUp, Ban, Swords, Check } from 'lucide-react';
import clsx from 'clsx';
import { SongBrowse } from '../components/SongBrowse';
import {
  AlbumArt,
  ErrorBanner,
  GlassCard,
  ScoreBadge,
  Spinner,
} from '../components/ui';
import { api, type Song } from '../lib/api';

type Bucket = 'fire' | 'solid' | 'skip';
type Step = 'search' | 'bucket' | 'compare' | 'done';

const BUCKETS: {
  id: Bucket;
  label: string;
  desc: string;
  range: string;
  Icon: typeof Flame;
  color: string;
  glow: string;
}[] = [
  { id: 'fire', label: 'Fire', desc: 'Instant favorite', range: '6.7–10.0', Icon: Flame, color: 'bg-white border-rose-200 hover:border-rose-400 text-rose-700', glow: 'hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)]' },
  { id: 'solid', label: 'Solid', desc: 'Good, not elite', range: '3.4–6.6', Icon: ThumbsUp, color: 'bg-white border-indigo-200 hover:border-indigo-400 text-indigo-700', glow: 'hover:shadow-[0_12px_40px_rgba(79,70,229,0.12)]' },
  { id: 'skip', label: 'Skip', desc: 'Not for me', range: '0.0–3.3', Icon: Ban, color: 'bg-white border-slate-200 hover:border-slate-400 text-slate-600', glow: 'hover:shadow-[0_12px_40px_rgba(100,116,139,0.1)]' },
];

interface Opponent {
  rating: { song_id: string; elo: number; display_score: number };
  song: Song & { id: string };
}

export function Rate() {
  const location = useLocation();
  const [step, setStep] = useState<Step>('search');
  const [song, setSong] = useState<Song | null>(location.state?.song ?? null);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [ratedSongId, setRatedSongId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{
    available: boolean;
    predicted_score?: number;
  } | null>(null);
  const [paradox, setParadox] = useState<{
    message: string;
    chain: { song_id: string; title: string; artist: string }[];
    winnerId: string;
    loserId: string;
  } | null>(null);

  useEffect(() => {
    if (song) {
      setStep('bucket');
      setError(null);
      api<typeof prediction>('/ml/predict-rating', {
        method: 'POST',
        body: JSON.stringify({
          spotify_id: song.spotify_id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration_ms: song.duration_ms,
          artists: song.artists,
        }),
      })
        .then(setPrediction)
        .catch(() => setPrediction(null));
    }
  }, [song]);

  const placeBucket = async (b: Bucket) => {
    if (!song || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{
        rating: { song_id: string; song: Song & { id: string } };
        opponent: Opponent | null;
        comparisons_remaining: number;
      }>('/ratings/place', {
        method: 'POST',
        body: JSON.stringify({ ...song, bucket: b }),
      });
      setBucket(b);
      setRatedSongId(res.rating.song_id);
      setOpponent(res.opponent);
      setRemaining(res.comparisons_remaining);
      setStep(res.opponent ? 'compare' : 'done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rate song');
    } finally {
      setLoading(false);
    }
  };

  const submitCompare = async (winnerId: string, loserId: string, confirmParadox = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{
        paradox?: boolean;
        message?: string;
        chain?: { song_id: string; title: string; artist: string }[];
        opponent: Opponent | null;
        comparisons_remaining: number;
      }>('/ratings/compare', {
        method: 'POST',
        body: JSON.stringify({
          winner_song_id: winnerId,
          loser_song_id: loserId,
          rated_song_id: ratedSongId,
          confirm_paradox: confirmParadox,
        }),
      });
      if (res.paradox) {
        setParadox({
          message: res.message || 'This contradicts your earlier ratings.',
          chain: res.chain || [],
          winnerId,
          loserId,
        });
        return;
      }
      setParadox(null);
      setOpponent(res.opponent);
      setRemaining(res.comparisons_remaining);
      if (!res.opponent || res.comparisons_remaining === 0) setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const pickWinner = (winnerId: string, loserId: string) => submitCompare(winnerId, loserId);

  const reset = () => {
    setSong(null);
    setBucket(null);
    setRatedSongId(null);
    setOpponent(null);
    setStep('search');
    setPrediction(null);
    setParadox(null);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {step === 'search' && (
        <>
          <div className="shrink-0 mb-4 animate-fade-up">
            <p className="text-[11px] tracking-[0.22em] uppercase text-accent font-semibold mb-2">Forte</p>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Rate a song</h1>
            <p className="text-muted text-sm mt-1">Pick from recent, playlists, or search.</p>
          </div>
          {error && <div className="shrink-0 mb-3"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}
          <div className="flex-1 min-h-0">
            <SongBrowse onSelect={setSong} />
          </div>
        </>
      )}

      {step !== 'search' && error && (
        <div className="mb-6"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>
      )}

      {step !== 'search' && (
        <div className="overflow-auto">

      {song && step === 'bucket' && (
        <div className="space-y-8 animate-fade-up">
          <button
            type="button"
            onClick={reset}
            className="text-sm text-muted hover:text-text transition cursor-pointer"
          >
            ← Pick a different song
          </button>
          <GlassCard className="flex flex-col md:flex-row items-center gap-6 p-6">
            <AlbumArt src={song.album_art} alt={song.title} size="xl" className="shadow-2xl" />
            <div className="text-center md:text-left flex-1">
              <p className="font-display text-2xl md:text-3xl font-semibold">{song.title}</p>
              <p className="text-muted mt-1">{song.artist}</p>
              <p className="text-sm text-muted/70 mt-0.5">{song.album}</p>
              {prediction?.available && (
                <p className="mt-4 text-sm text-text">
                  Estimated score{' '}
                  <span className="font-display text-lg font-semibold text-accent tabular-nums">
                    {prediction.predicted_score}
                  </span>
                </p>
              )}
            </div>
          </GlassCard>

          <p className="text-center text-muted">First impression — where does it land?</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUCKETS.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={loading}
                onClick={() => placeBucket(b.id)}
                className={clsx(
                  'relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer shadow-sm',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'hover:-translate-y-1 active:scale-[0.98]',
                  b.color,
                  b.glow,
                )}
              >
                {loading ? (
                  <div className="flex justify-center py-4"><Spinner /></div>
                ) : (
                  <>
                    <b.Icon className="w-8 h-8 mb-3 mx-auto" />
                    <p className="font-display text-xl font-semibold">{b.label}</p>
                    <p className="text-xs text-muted mt-1">{b.desc}</p>
                    <p className="text-xs text-muted/60 mt-2 font-mono">{b.range}</p>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'compare' && song && opponent && ratedSongId && (
        <div className="space-y-8 animate-fade-up">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-muted text-sm mb-2">
              <Swords className="w-4 h-4" />
              Head-to-head
            </div>
            <p className="font-display text-xl">
              Which do you prefer?
              <span className="text-muted text-base ml-2">
                ({remaining} left)
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: ratedSongId, s: song, score: null, tag: 'New' },
              { id: opponent.rating.song_id, s: opponent.song, score: opponent.rating.display_score, tag: 'Library' },
            ].map(({ id, s, score, tag }) => (
              <button
                key={id}
                type="button"
                disabled={loading}
                onClick={() =>
                  pickWinner(id, id === ratedSongId ? opponent.rating.song_id : ratedSongId)
                }
                className="group glass rounded-2xl p-8 text-center border border-black/[0.08] hover:border-accent/40 hover:bg-accent/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                <span className="text-xs uppercase tracking-widest text-muted mb-4 block">{tag}</span>
                <AlbumArt src={s.album_art} alt={s.title} size="lg" className="mx-auto group-hover:scale-105 transition-transform duration-300" />
                <p className="font-display text-lg font-medium mt-5">{s.title}</p>
                <p className="text-sm text-muted mt-1">{s.artist}</p>
                {score != null && <div className="mt-3"><ScoreBadge score={score} /></div>}
              </button>
            ))}
          </div>
          {loading && <div className="flex justify-center"><Spinner /></div>}
        </div>
      )}

      {paradox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <GlassCard className="max-w-md w-full !p-6 space-y-4 animate-fade-up">
            <h3 className="font-display text-xl font-semibold">Taste paradox</h3>
            <p className="text-sm text-muted">{paradox.message}</p>
            {paradox.chain.length > 0 && (
              <p className="text-xs text-muted font-mono">
                {paradox.chain.map((c) => c.title).join(' → ')}
              </p>
            )}
            <p className="text-sm">Your pick will override the conflicting comparison and recalculate scores.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setParadox(null)}
                className="px-4 py-2 text-sm text-muted hover:text-text cursor-pointer"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => submitCompare(paradox.winnerId, paradox.loserId, true)}
                className="px-5 py-2 text-sm bg-accent text-white rounded-full font-medium cursor-pointer disabled:opacity-50"
              >
                Yes, keep my pick
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center space-y-6 py-16 animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/15 border border-accent/30">
            <Check className="w-10 h-10 text-accent" />
          </div>
          <div>
            <p className="font-display text-3xl font-semibold">Locked in.</p>
            <p className="text-muted mt-2">
              <span className="text-text font-medium">{song?.title}</span>
              {' '}placed in{' '}
              <span className="text-accent capitalize font-medium">{bucket}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="px-8 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent/90 hover:scale-105 transition-all duration-200 cursor-pointer glow-green"
          >
            Rate another
          </button>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
