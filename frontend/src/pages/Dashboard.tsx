import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, Disc3, Music2, Star, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { SongSearch } from '../components/SongSearch';
import { AlbumArt, BucketBadge, GlassCard, ScoreBadge } from '../components/ui';
import { api, type Rating } from '../lib/api';

interface Stats {
  total: number;
  average_score: number;
  favorite_artist: string | null;
  favorite_album: string | null;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [top, setTop] = useState<Rating[]>([]);
  const [recent, setRecent] = useState<Rating[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Rating[]>('/collection/top?limit=10').then(setTop).catch(() => {});
    api<Rating[]>('/collection/recent?limit=10').then(setRecent).catch(() => {});
    api<Stats>('/collection/stats').then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl glass p-8 md:p-12 animate-fade-up border border-black/[0.06]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-primary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="relative">
          <p className="text-[11px] tracking-[0.22em] uppercase text-accent font-semibold mb-3">Your taste, ranked</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight max-w-xl tracking-tight">
            What are you <span className="text-gradient">listening</span> to?
          </h1>
          <p className="text-muted mt-4 max-w-md">Search any track on Spotify and rank it with ELO-style comparisons.</p>
          <div className="mt-8 max-w-xl">
            <SongSearch
              onSelect={(song) => navigate('/rate', { state: { song } })}
              autoFocus
              large
            />
          </div>
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {[
            { label: 'Songs Rated', value: stats.total, icon: Disc3 },
            { label: 'Avg Score', value: stats.average_score.toFixed(1), icon: TrendingUp },
            { label: 'Top Artist', value: stats.favorite_artist ?? '—', icon: Music2 },
            { label: 'Top Album', value: stats.favorite_album ?? '—', icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <GlassCard key={label} className="!p-5">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">{label}</span>
              </div>
              <p className="font-display text-2xl font-semibold truncate">{value}</p>
            </GlassCard>
          ))}
        </section>
      )}

      <section className="grid lg:grid-cols-2 gap-8">
        <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Top Rated</h2>
            <button
              type="button"
              onClick={() => navigate('/collection')}
              className="text-sm text-muted hover:text-accent flex items-center gap-1 transition cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {top.map((r, i) => {
              const song = r.songs!;
              const isTop = i === 0;
              return (
                <GlassCard key={r.id} hover className={clsx('!p-3 flex items-center gap-4', isTop && 'ring-1 ring-accent/25 glow-green')}>
                  <span className={clsx('font-display text-lg w-6 text-center', isTop ? 'text-accent' : 'text-muted')}>{i + 1}</span>
                  <AlbumArt src={song.album_art} alt={song.title} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                    <p className="text-xs text-muted truncate">{song.artist}</p>
                  </div>
                  <ScoreBadge score={r.display_score} size="sm" />
                </GlassCard>
              );
            })}
            {top.length === 0 && (
              <GlassCard className="text-center !py-12 text-muted text-sm">
                No ratings yet — search above to rank your first track.
              </GlassCard>
            )}
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="font-display text-xl font-semibold mb-4">Recently Rated</h2>
          <div className="space-y-2">
            {recent.map((r) => {
              const song = r.songs!;
              return (
                <GlassCard key={r.id} className="!p-3 flex items-center gap-4">
                  <AlbumArt src={song.album_art} alt={song.title} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                    <p className="text-xs text-muted truncate">{song.artist}</p>
                  </div>
                  <BucketBadge bucket={r.bucket} />
                </GlassCard>
              );
            })}
            {recent.length === 0 && (
              <GlassCard className="text-center !py-12 text-muted text-sm">
                Your recent ratings will show up here.
              </GlassCard>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
