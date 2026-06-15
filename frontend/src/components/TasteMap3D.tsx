import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const PITCH = 0.72;

export interface SurfaceCell {
  x: number;
  y: number;
  z: number;
  genre: string;
  band: string;
  avg_score: number;
  certainty: number;
  count: number;
}

type Vec3 = { x: number; y: number; z: number };
type SurfaceGrid = SurfaceCell[][];
type Proj = { px: number; py: number; depth: number };

function project(p: Vec3, rotY: number, zoom: number, w: number, h: number): Proj {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const x1 = p.x * cos - p.z * sin;
  const z1 = p.x * sin + p.z * cos;
  const y1 = p.y / 10;

  const y2 = y1 * Math.cos(PITCH) + z1 * Math.sin(PITCH);
  const z2 = -y1 * Math.sin(PITCH) + z1 * Math.cos(PITCH);

  const dist = 5;
  const f = dist / (dist + z2 + 0.85);
  const scale = Math.min(w, h) * 0.43 * zoom * f;
  return {
    px: w * 0.5 + x1 * scale,
    py: h * 0.56 - y2 * scale * 0.88,
    depth: z2,
  };
}

function topoColor(y: number, weight: number): string {
  const t = Math.max(0, Math.min(1, y / 10));
  const r = Math.round(45 + 185 * t);
  const g = Math.round(55 + 125 * t);
  const b = Math.round(95 + 25 * (1 - t));
  const a = 0.45 + weight * 0.5;
  return `rgba(${r},${g},${b},${a})`;
}

function drawLine3D(
  ctx: CanvasRenderingContext2D,
  a: Vec3,
  b: Vec3,
  rotY: number,
  zoom: number,
  w: number,
  h: number,
  color: string,
  width = 1,
) {
  const pa = project(a, rotY, zoom, w, h);
  const pb = project(b, rotY, zoom, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.px, pa.py);
  ctx.lineTo(pb.px, pb.py);
  ctx.stroke();
}

function triHasData(a: SurfaceCell, b: SurfaceCell, c: SurfaceCell): boolean {
  return a.count > 0 && b.count > 0 && c.count > 0;
}

export function TasteMap3D({
  surface,
  genreLabels,
}: {
  surface: SurfaceGrid;
  genreLabels?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotY, setRotY] = useState(0.38);
  const [zoom, setZoom] = useState(1.0);
  const drag = useRef<{ active: boolean; x: number }>({ active: false, x: 0 });
  const [hover, setHover] = useState<SurfaceCell | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surface.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#f0efe9';
    ctx.fillRect(0, 0, w, h);

    for (let i = -1; i <= 1; i += 0.5) {
      drawLine3D(ctx, { x: i, y: 0, z: -1 }, { x: i, y: 0, z: 1 }, rotY, zoom, w, h, 'rgba(0,0,0,0.06)', 1);
      drawLine3D(ctx, { x: -1, y: 0, z: i }, { x: 1, y: 0, z: i }, rotY, zoom, w, h, 'rgba(0,0,0,0.06)', 1);
    }

    drawLine3D(ctx, { x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, rotY, zoom, w, h, 'rgba(22,163,74,0.45)', 1.5);
    drawLine3D(ctx, { x: 0, y: 0, z: -1.05 }, { x: 0, y: 0, z: 1.05 }, rotY, zoom, w, h, 'rgba(14,116,144,0.4)', 1.5);
    drawLine3D(ctx, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, rotY, zoom, w, h, 'rgba(225,29,72,0.35)', 1.5);

    const tris: { pts: Proj[]; cell: SurfaceCell; corners: [SurfaceCell, SurfaceCell, SurfaceCell] }[] = [];
    for (let i = 0; i < surface.length - 1; i++) {
      for (let j = 0; j < surface[i].length - 1; j++) {
        const c00 = surface[i][j];
        const c10 = surface[i + 1][j];
        const c01 = surface[i][j + 1];
        const c11 = surface[i + 1][j + 1];
        tris.push({
          pts: [
            project(c00, rotY, zoom, w, h),
            project(c10, rotY, zoom, w, h),
            project(c11, rotY, zoom, w, h),
          ],
          cell: c11,
          corners: [c00, c10, c11],
        });
        tris.push({
          pts: [
            project(c00, rotY, zoom, w, h),
            project(c01, rotY, zoom, w, h),
            project(c11, rotY, zoom, w, h),
          ],
          cell: c01,
          corners: [c00, c01, c11],
        });
      }
    }
    tris.sort((a, b) => {
      const da = a.pts.reduce((s, p) => s + p.depth, 0) / 3;
      const db = b.pts.reduce((s, p) => s + p.depth, 0) / 3;
      return da - db;
    });

    for (const tri of tris) {
      if (!triHasData(...tri.corners)) continue;
      ctx.beginPath();
      ctx.moveTo(tri.pts[0].px, tri.pts[0].py);
      ctx.lineTo(tri.pts[1].px, tri.pts[1].py);
      ctx.lineTo(tri.pts[2].px, tri.pts[2].py);
      ctx.closePath();
      ctx.fillStyle = topoColor(tri.cell.y, tri.cell.certainty);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,0,0,${0.05 + (tri.cell.y / 10) * 0.04})`;
      ctx.stroke();
    }

    const labels = genreLabels?.length
      ? genreLabels.map((genre, i) => ({
          genre,
          x: surface[0]?.[i]?.x ?? 0,
        }))
      : (surface[0] ?? []).map((c) => ({ genre: c.genre, x: c.x }));

    for (const { genre, x } of labels) {
      const p = project({ x, y: 0, z: 0 }, rotY, zoom, w, h);
      if (p.depth < -0.8) continue;
      ctx.fillStyle = 'rgba(190,24,24,0.85)';
      ctx.font = '8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(genre, p.px, p.py + 11);
      ctx.textAlign = 'left';
    }

    for (let tick = 0; tick <= 10; tick++) {
      const p = project({ x: 0, y: tick, z: 0 }, rotY, zoom, w, h);
      if (p.depth < -0.8) continue;
      ctx.fillStyle = 'rgba(22,163,74,0.9)';
      ctx.font = '9px ui-monospace,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(tick), p.px - 7, p.py + 3);
      ctx.textAlign = 'left';
    }
  }, [surface, genreLabels, rotY, zoom]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current.active) {
      const dx = e.clientX - drag.current.x;
      drag.current.x = e.clientX;
      setRotY((r) => r + dx * 0.012);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: SurfaceCell | null = null;
    let best = Infinity;
    for (const row of surface) {
      for (const cell of row) {
        if (cell.count <= 0) continue;
        const pr = project(cell, rotY, zoom, rect.width, rect.height);
        const d = (mx - pr.px) ** 2 + (my - pr.py) ** 2;
        if (d < best && d < 1200) {
          best = d;
          found = cell;
        }
      }
    }
    setHover(found);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-black/[0.08] bg-[#f0efe9] h-full min-h-[440px] shadow-sm">
      <canvas
        ref={canvasRef}
        className="w-full h-full min-h-[440px] cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => {
          drag.current = { active: true, x: e.clientX };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current.active = false; }}
        onPointerLeave={() => { drag.current.active = false; }}
      />
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, z + 0.12))} className="w-8 h-8 rounded-lg bg-white/90 border border-black/[0.08] flex items-center justify-center cursor-pointer hover:bg-white shadow-sm">
          <Plus className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.7, z - 0.12))} className="w-8 h-8 rounded-lg bg-white/90 border border-black/[0.08] flex items-center justify-center cursor-pointer hover:bg-white shadow-sm">
          <Minus className="w-4 h-4" />
        </button>
      </div>
      {hover && (
        <div className="absolute top-3 left-3 glass rounded-xl px-3 py-2 text-xs pointer-events-none border border-black/[0.08]">
          <p className="font-medium capitalize">{hover.genre}</p>
          <p className="text-accent mt-0.5">{hover.avg_score} · {hover.count} song{hover.count !== 1 ? 's' : ''}</p>
          <p className="text-muted/70 mt-0.5 capitalize">{hover.band}</p>
        </div>
      )}
    </div>
  );
}
