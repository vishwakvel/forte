import { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import { AlbumArt, BucketBadge, GlassCard, PageHeader, ScoreBadge } from '../components/ui';
import { api, type Rating } from '../lib/api';

const FEATURE_LABELS: Record<string, string> = {
  energy: 'Energy',
  valence: 'Valence',
  danceability: 'Dance',
  acousticness: 'Acoustic',
  instrumentalness: 'Instrumental',
  speechiness: 'Speech',
};

export function Collection() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [sortBy, setSortBy] = useState('elo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [bucketFilter, setBucketFilter] = useState<string>('');
  const [selected, setSelected] = useState<Rating | null>(null);
  const [editScore, setEditScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = () => {
    const params = new URLSearchParams({ sort_by: sortBy, sort_dir: sortDir });
    if (bucketFilter) params.set('bucket', bucketFilter);
    return api<Rating[]>(`/collection?${params}`).then(setRatings).catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, [sortBy, sortDir, bucketFilter]);

  useEffect(() => {
    if (selected) setEditScore(String(selected.display_score));
  }, [selected]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  const saveScore = async () => {
    if (!selected?.songs) return;
    const score = parseFloat(editScore);
    if (Number.isNaN(score) || score < 0 || score > 10) {
      setSaveError('Enter a score between 0 and 10');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api<Rating>(`/ratings/${selected.song_id}/score`, {
        method: 'PATCH',
        body: JSON.stringify({ display_score: score }),
      });
      setSelected(updated);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update score');
    } finally {
      setSaving(false);
    }
  };

  const radarData = selected?.songs?.audio_features
    ? Object.entries(FEATURE_LABELS).map(([k, label]) => ({
        feature: label,
        value: (selected.songs!.audio_features![k] ?? 0) * (k === 'loudness' ? 0 : 1),
      }))
    : [];

  return (
    <div>
      <PageHeader title="Collection" subtitle={`${ratings.length} tracks in your library`} />

      <div className="flex gap-2 flex-wrap mb-6">
        {['', 'fire', 'solid', 'skip'].map((b) => (
          <button
            key={b || 'all'}
            type="button"
            onClick={() => setBucketFilter(b)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium border transition cursor-pointer capitalize',
              bucketFilter === b
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'text-muted border-white/10 hover:border-white/20 hover:text-text',
            )}
          >
            {b || 'All'}
          </button>
        ))}
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-muted text-xs uppercase tracking-wider">
                <th className="p-4 text-left w-14" />
                {[
                  ['title', 'Title'],
                  ['elo', 'Score'],
                  ['bucket', 'Bucket'],
                  ['created_at', 'Added'],
                ].map(([col, label]) => (
                  <th
                    key={col}
                    className="p-4 text-left cursor-pointer hover:text-text transition"
                    onClick={() => toggleSort(col)}
                  >
                    {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ratings.map((r) => {
                const song = r.songs!;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition"
                    onClick={() => setSelected(r)}
                  >
                    <td className="p-4"><AlbumArt src={song.album_art} alt={song.title} size="sm" /></td>
                    <td className="p-4">
                      <p className="font-medium">{song.title}</p>
                      <p className="text-muted text-xs">{song.artist}</p>
                    </td>
                    <td className="p-4"><ScoreBadge score={r.display_score} size="sm" /></td>
                    <td className="p-4"><BucketBadge bucket={r.bucket} /></td>
                    <td className="p-4 text-muted text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ratings.length === 0 && (
            <p className="text-center text-muted py-16">No tracks yet. Head to Rate to add some.</p>
          )}
        </div>
      </GlassCard>

      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="glass rounded-2xl p-8 max-w-lg w-full animate-fade-up border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-5">
              <AlbumArt src={selected.songs?.album_art} alt={selected.songs?.title ?? ''} size="lg" />
              <div>
                <h3 className="font-display text-xl font-semibold">{selected.songs?.title}</h3>
                <p className="text-muted text-sm">{selected.songs?.artist}</p>
                <div className="mt-3 flex gap-2 items-center">
                  <ScoreBadge score={selected.display_score} />
                  <BucketBadge bucket={selected.bucket} />
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="text-xs text-muted uppercase tracking-wider">Update score</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent/50"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveScore}
                  className="px-4 py-2 rounded-xl bg-accent text-bg text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {saveError && <p className="text-rose-400 text-xs">{saveError}</p>}
            </div>
            {radarData.length > 0 && (
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-full mt-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition cursor-pointer text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
