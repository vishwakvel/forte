import { useEffect, useRef, useState } from 'react';

interface GenreNode {
  id: string;
  label: string;
  size: number;
  weight: number;
  avg_score: number;
  parent: string;
  is_artist_fallback?: boolean;
}

interface GenreEdge {
  source: string;
  target: string;
  strength: number;
}

const PALETTE = ['#f43f5e', '#a855f7', '#22d3ee', '#1db954', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'];

function parentColor(parent: string): string {
  let h = 0;
  for (let i = 0; i < parent.length; i++) h = (h * 31 + parent.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function GenreBrain({
  nodes,
  edges,
}: {
  nodes: GenreNode[];
  edges: GenreEdge[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<{ id: string; x: number; y: number; vx: number; vy: number; r: number; node: GenreNode }[]>([]);
  const [hover, setHover] = useState<GenreNode | null>(null);

  useEffect(() => {
    const maxSize = Math.max(...nodes.map((n) => n.size), 1);
    simRef.current = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = 18 + Math.sqrt(n.size / maxSize) * 42;
      return {
        id: n.id,
        x: 200 + Math.cos(angle) * 80,
        y: 200 + Math.sin(angle) * 80,
        vx: 0,
        vy: 0,
        r,
        node: n,
      };
    });
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let raf = 0;

    const tick = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      const bodies = simRef.current;
      const idMap = new Map(bodies.map((b) => [b.id, b]));

      // force simulation (settle over first ~180 frames, then gentle)
      const alpha = frame < 180 ? 0.35 : 0.08;
      for (const a of bodies) {
        a.vx += (cx - a.x) * 0.002;
        a.vy += (cy - a.y) * 0.002;
      }
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const b = bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 0.01);
          const min = a.r + b.r + 8;
          if (dist < min) {
            const f = (min - dist) * 0.04;
            a.vx -= (dx / dist) * f;
            a.vy -= (dy / dist) * f;
            b.vx += (dx / dist) * f;
            b.vy += (dy / dist) * f;
          } else {
            const f = 120 / (dist * dist);
            a.vx -= (dx / dist) * f;
            a.vy -= (dy / dist) * f;
            b.vx += (dx / dist) * f;
            b.vy += (dy / dist) * f;
          }
        }
      }
      for (const e of edges) {
        const a = idMap.get(e.source);
        const b = idMap.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const f = e.strength * 0.015 * dist;
        a.vx += (dx / dist) * f;
        a.vy += (dy / dist) * f;
        b.vx -= (dx / dist) * f;
        b.vy -= (dy / dist) * f;
      }
      for (const b of bodies) {
        b.vx *= 0.82;
        b.vy *= 0.82;
        b.x += b.vx * alpha;
        b.y += b.vy * alpha;
      }

      // draw
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
      bg.addColorStop(0, '#0f0f18');
      bg.addColorStop(1, '#050508');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // blend bridges between related genres
      ctx.globalCompositeOperation = 'lighter';
      for (const e of edges) {
        const a = idMap.get(e.source);
        const b = idMap.get(e.target);
        if (!a || !b) continue;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const ca = parentColor(a.node.parent);
        const cb = parentColor(b.node.parent);
        grad.addColorStop(0, ca + '33');
        grad.addColorStop(0.5, `rgba(255,255,255,${0.06 * e.strength})`);
        grad.addColorStop(1, cb + '33');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4 + e.strength * 10;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // blobs (back to front by size)
      const sorted = [...bodies].sort((a, b) => a.r - b.r);
      for (const b of sorted) {
        const col = parentColor(b.node.parent);
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, col + 'cc');
        grad.addColorStop(0.55, col + '55');
        grad.addColorStop(1, col + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // labels on larger nodes
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const b of bodies) {
        if (b.r < 28) continue;
        const lines = b.node.label.length > 16
          ? [b.node.label.slice(0, 15) + '…']
          : [b.node.label];
        lines.forEach((line, i) => {
          ctx.fillText(line, b.x, b.y + i * 12);
        });
      }

      frame++;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: GenreNode | null = null;
    for (const b of simRef.current) {
      if ((mx - b.x) ** 2 + (my - b.y) ** 2 < b.r ** 2) found = b.node;
    }
    setHover(found);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 h-full min-h-[420px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full min-h-[420px]"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div className="absolute top-3 right-3 glass rounded-xl px-3 py-2 text-xs max-w-[220px] pointer-events-none border border-white/10">
          <p className="font-medium capitalize">{hover.label}</p>
          <p className="text-muted mt-1">{hover.size} songs · {hover.avg_score}</p>
        </div>
      )}
    </div>
  );
}
