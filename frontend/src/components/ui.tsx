import clsx from 'clsx';
import { Flame, ThumbsUp, Ban } from 'lucide-react';

const BUCKET_STYLES = {
  fire: 'bg-rose-500/10 text-rose-700 border-rose-500/25',
  solid: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25',
  skip: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const BUCKET_LABELS = { fire: 'Fire', solid: 'Solid', skip: 'Skip' };

export function BucketBadge({ bucket }: { bucket: 'fire' | 'solid' | 'skip' }) {
  const Icon = bucket === 'fire' ? Flame : bucket === 'solid' ? ThumbsUp : Ban;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
        BUCKET_STYLES[bucket],
      )}
    >
      <Icon className="w-3 h-3" />
      {BUCKET_LABELS[bucket]}
    </span>
  );
}

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color =
    score >= 6.7 ? 'text-rose-700' : score >= 3.4 ? 'text-indigo-700' : 'text-slate-600';
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-3xl' };
  return (
    <span className={clsx('font-display font-semibold tabular-nums', color, sizes[size])}>
      {score.toFixed(1)}
    </span>
  );
}

export function AlbumArt({
  src,
  alt,
  size = 'md',
  className,
  round,
}: {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  round?: boolean;
}) {
  const sizes = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-32 h-32', xl: 'w-48 h-48' };
  const radius = round ? 'rounded-full' : 'rounded-xl';
  return src ? (
    <img
      src={src}
      alt={alt}
      className={clsx(sizes[size], radius, 'object-cover shadow-md ring-1 ring-black/[0.08]', className)}
    />
  ) : (
    <div
      className={clsx(
        sizes[size],
        radius,
        'bg-black/[0.04] flex items-center justify-center text-muted text-xs ring-1 ring-black/[0.08]',
        className,
      )}
    >
      ♪
    </div>
  );
}

export function GlassCard({
  children,
  className,
  hover,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={clsx(
        'glass rounded-2xl p-5 app-card-hover',
        hover && 'hover:-translate-y-0.5 cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 animate-fade-up">
      <p className="text-[11px] tracking-[0.22em] uppercase text-accent font-semibold mb-2">Forte</p>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-text">{title}</h1>
      {subtitle && <p className="text-muted mt-2 text-sm md:text-base max-w-2xl">{subtitle}</p>}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 text-sm animate-fade-up">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-rose-700 hover:text-rose-900 cursor-pointer">
          ✕
        </button>
      )}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-black/10 border-t-accent rounded-full animate-spin" />
  );
}
