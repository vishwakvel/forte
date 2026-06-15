import clsx from 'clsx';
import { Flame, ThumbsUp, Ban } from 'lucide-react';

const BUCKET_STYLES = {
  fire: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  solid: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  skip: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const BUCKET_LABELS = { fire: 'Fire', solid: 'Solid', skip: 'Skip' };

export function BucketBadge({ bucket }: { bucket: 'fire' | 'solid' | 'skip' }) {
  const Icon = bucket === 'fire' ? Flame : bucket === 'solid' ? ThumbsUp : Ban;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
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
    score >= 6.7 ? 'text-rose-400' : score >= 3.4 ? 'text-indigo-300' : 'text-slate-400';
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
      className={clsx(sizes[size], radius, 'object-cover shadow-lg ring-1 ring-white/10', className)}
    />
  ) : (
    <div
      className={clsx(
        sizes[size],
        radius,
        'bg-white/5 flex items-center justify-center text-muted text-xs ring-1 ring-white/10',
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
        'glass rounded-2xl p-5 transition-all duration-200',
        hover && 'hover:bg-white/[0.06] hover:border-white/15 hover:-translate-y-0.5 cursor-pointer',
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
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted mt-2 text-sm md:text-base">{subtitle}</p>}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm animate-fade-up">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-rose-400 hover:text-rose-200 cursor-pointer">
          ✕
        </button>
      )}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
  );
}
