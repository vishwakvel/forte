import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceLine,
} from 'recharts';
import { api } from '../lib/api';
import { GlassCard, PageHeader } from '../components/ui';

const BUCKET_COLORS = { fire: '#f43f5e', solid: '#6366f1', skip: '#64748b' };

interface DriftData {
  available: boolean;
  message?: string;
  series?: Record<
    string,
    { dates: string[]; values: number[]; change_points: string[] }
  >;
  insights?: string[];
}

interface EmbeddingData {
  available: boolean;
  message?: string;
  points?: {
    x: number;
    y: number;
    title: string;
    artist: string;
    elo: number;
    bucket: 'fire' | 'solid' | 'skip';
    cluster_label: string;
    created_at: string;
  }[];
  timeline_dates?: string[];
}

export function Insights() {
  const [drift, setDrift] = useState<DriftData | null>(null);
  const [embedding, setEmbedding] = useState<EmbeddingData | null>(null);
  const [timelineDates, setTimelineDates] = useState<string[]>([]);
  const [timelineIdx, setTimelineIdx] = useState(-1);

  useEffect(() => {
    api<DriftData>('/ml/taste-drift').then(setDrift);
    api<EmbeddingData>('/ml/embedding').then((data) => {
      setEmbedding(data);
      if (data.timeline_dates) setTimelineDates(data.timeline_dates);
    });
  }, []);

  useEffect(() => {
    if (timelineIdx < 0) return;
    const before = timelineDates[timelineIdx] + 'T23:59:59Z';
    api<EmbeddingData>(`/ml/embedding?before=${encodeURIComponent(before)}`).then(
      setEmbedding,
    );
  }, [timelineIdx, timelineDates]);

  const locked = drift && !drift.available;

  if (locked) {
    return (
      <div className="text-center py-24 animate-fade-up">
        <PageHeader title="Your Taste Over Time" subtitle={drift.message} />
        <GlassCard className="max-w-md mx-auto !py-12 text-muted">
          Rate at least 20 songs to unlock drift detection and taste mapping.
        </GlassCard>
      </div>
    );
  }

  const features = drift?.series ? Object.keys(drift.series) : [];

  return (
    <div className="space-y-10">
      <PageHeader title="Your Taste Over Time" subtitle="How your audio preferences shift over time" />

      {drift?.insights && drift.insights.length > 0 && (
        <div className="space-y-2">
          {drift.insights.map((insight) => (
            <p key={insight} className="text-accent text-sm glass rounded-xl px-4 py-3">
              {insight}
            </p>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {features.map((feat) => {
          const s = drift!.series![feat];
          const chartData = s.dates.map((d, i) => ({ date: d.slice(0, 10), value: s.values[i] }));
          return (
            <GlassCard key={feat} className="!p-4">
              <h3 className="text-sm font-medium capitalize mb-3">{feat}</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#1db954" dot={false} />
                  {s.change_points.map((cp) => (
                    <ReferenceLine
                      key={cp}
                      x={cp.slice(0, 10)}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          );
        })}
      </div>

      {embedding?.available && embedding.points && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Taste Map</h3>
          {timelineDates.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-forte-muted">Timeline</span>
              <input
                type="range"
                min={-1}
                max={timelineDates.length - 1}
                value={timelineIdx}
                onChange={(e) => setTimelineIdx(Number(e.target.value))}
                className="flex-1 accent-forte-green"
              />
              <span className="text-sm text-forte-muted font-mono">
                {timelineIdx < 0 ? 'All time' : timelineDates[timelineIdx]}
              </span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <XAxis type="number" dataKey="x" hide />
              <YAxis type="number" dataKey="y" hide />
              <ZAxis type="number" dataKey="elo" range={[30, 200]} />
              <Tooltip
                content={({ payload }) =>
                  payload?.[0] ? (
                    <div className="bg-forte-elevated border border-forte-border p-2 rounded text-xs">
                      <p>{payload[0].payload.title}</p>
                      <p className="text-forte-muted">{payload[0].payload.artist}</p>
                      <p className="text-forte-green">{payload[0].payload.cluster_label}</p>
                    </div>
                  ) : null
                }
              />
              <Scatter data={embedding.points}>
                {embedding.points.map((p, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[p.bucket]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
