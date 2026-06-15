import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { GlassCard, PageHeader } from '../components/ui';
import { TasteMap3D, type SurfaceCell } from '../components/TasteMap3D';
import { GenreBrain } from '../components/GenreBrain';

interface EmbeddingData {
  available: boolean;
  message?: string;
  surface?: SurfaceCell[][];
  genre_labels?: string[];
  timeline_dates?: string[];
}

interface GenreData {
  available: boolean;
  message?: string;
  nodes?: { id: string; label: string; size: number; weight: number; avg_score: number; parent: string }[];
  edges?: { source: string; target: string; strength: number }[];
}

export function Insights() {
  const [embedding, setEmbedding] = useState<EmbeddingData | null>(null);
  const [genres, setGenres] = useState<GenreData | null>(null);
  const [timelineDates, setTimelineDates] = useState<string[]>([]);
  const [timelineIdx, setTimelineIdx] = useState(-1);

  const load = () => {
    api<EmbeddingData>('/ml/embedding').then((data) => {
      setEmbedding(data);
      if (data.timeline_dates) setTimelineDates(data.timeline_dates);
    });
    api<GenreData>('/ml/genre-graph').then(setGenres);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (timelineIdx < 0) {
      api<EmbeddingData>('/ml/embedding').then(setEmbedding);
      return;
    }
    const before = timelineDates[timelineIdx] + 'T23:59:59Z';
    api<EmbeddingData>(`/ml/embedding?before=${encodeURIComponent(before)}`).then(setEmbedding);
  }, [timelineIdx, timelineDates]);

  if (!embedding) {
    return <div className="text-center py-24 text-muted">Loading…</div>;
  }

  const mapReady = embedding.available && embedding.surface;
  const genreReady = genres?.available && genres.nodes && genres.nodes.length > 0;

  if (!mapReady && !genreReady) {
    return (
      <div className="text-center py-24 animate-fade-up pb-24">
        <PageHeader title="Insights" />
        <GlassCard className="max-w-md mx-auto !py-12 text-muted">
          {embedding.message || 'Rate more songs to unlock.'}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Insights" />

      <div className="grid lg:grid-cols-2 gap-5 items-stretch mt-6">
        {mapReady && (
          <GlassCard className="flex flex-col gap-3 min-h-[480px] !p-5 md:!p-6">
            <h2 className="font-display text-lg font-semibold">Taste map</h2>
            {timelineDates.length > 0 && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={-1}
                  max={timelineDates.length - 1}
                  value={timelineIdx}
                  onChange={(e) => setTimelineIdx(Number(e.target.value))}
                  className="flex-1 accent-accent h-1"
                />
                <span className="text-xs text-muted font-mono w-20 text-right shrink-0">
                  {timelineIdx < 0 ? 'All' : timelineDates[timelineIdx]}
                </span>
              </div>
            )}
            <TasteMap3D surface={embedding.surface!} genreLabels={embedding.genre_labels} />
            <p className="text-[11px] text-muted/70 flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-emerald-600">↑</span> Rating</span>
              <span><span className="text-rose-600">↔</span> Genres (labeled on floor)</span>
              <span><span className="text-sky-600">↗</span> Library depth</span>
              <span className="text-muted/50">Drag to rotate</span>
            </p>
          </GlassCard>
        )}

        {genreReady && (
          <GlassCard className="flex flex-col gap-3 min-h-[480px] !p-5 md:!p-6">
            <h2 className="font-display text-lg font-semibold">Genres</h2>
            <div className="flex-1 min-h-[440px]">
              <GenreBrain nodes={genres.nodes!} edges={genres.edges ?? []} />
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
