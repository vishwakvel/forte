import { useRef, useState, type ReactNode } from 'react';
import { segment } from '../hooks/useScrollProgress';

export interface HowCard {
  image: string;
  label: string;
  title: string;
  body: string;
  tags: string[];
}

function Pop({ show, delay, children }: { show: number; delay: number; children: ReactNode }) {
  const t = Math.max(0, Math.min(1, (show - delay) / 0.35));
  const pop = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return (
    <div
      style={{
        opacity: pop,
        transform: `translateY(${(1 - pop) * 22}px) scale(${0.88 + pop * 0.12})`,
      }}
    >
      {children}
    </div>
  );
}

function TiltCard({ card }: { card: HowCard }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setTilt({ x: py * -12, y: px * 12 });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="w-full max-w-4xl rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.1)] border border-black/[0.06] overflow-hidden grid md:grid-cols-[minmax(240px,340px)_1fr] min-h-[360px] items-stretch transition-transform duration-150 ease-out"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
    >
      <div className="relative min-h-[220px] md:min-h-0 overflow-hidden bg-[#e8ebe4]">
        <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover object-center" draggable={false} />
      </div>
      <div className="p-8 md:p-10 flex flex-col justify-center">
        <p className="text-xs tracking-[0.2em] uppercase text-[#16a34a] font-semibold mb-3">{card.label}</p>
        <h3 className="landing-display text-3xl md:text-[2.1rem] font-semibold tracking-tight text-[#0a0a0a] mb-4 leading-tight">
          {card.title}
        </h3>
        <p className="text-sm md:text-base text-[#4a4a46] leading-relaxed mb-6">{card.body}</p>
        <div className="flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-full bg-[#f0f0eb] text-[11px] tracking-wide uppercase text-[#3d3d3a] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavArrow({ dir, disabled, onClick }: { dir: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 'left' ? 'Previous step' : 'Next step'}
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full border border-black/[0.1] bg-white/90 text-[#0a0a0a] flex items-center justify-center shadow-sm hover:bg-white hover:scale-105 transition disabled:opacity-25 disabled:pointer-events-none disabled:hover:scale-100 cursor-pointer"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {dir === 'left' ? (
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

export function LandingHowCarousel({
  progress,
  cards,
  activeIndex,
  onPrev,
  onNext,
}: {
  progress: number;
  cards: HowCard[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const sectionOpacity = segment(progress, 0.56, 0.6) * (1 - segment(progress, 0.72, 0.78));
  const sectionIn = segment(progress, 0.56, 0.62);

  return (
    <div
      id="how"
      className="absolute inset-0 z-[40] flex flex-col items-center justify-center px-4 pointer-events-none"
      style={{ opacity: sectionOpacity }}
    >
      <Pop show={sectionIn} delay={0}>
        <p className="landing-display text-sm md:text-base tracking-[0.22em] uppercase text-[#0a0a0a] font-semibold mb-8 text-center">
          How it works
        </p>
      </Pop>

      <div className="flex items-center justify-center gap-3 md:gap-5 w-full max-w-[calc(56rem+7rem)] mx-auto pointer-events-auto">
        <NavArrow dir="left" disabled={activeIndex === 0} onClick={onPrev} />

        <div className="relative flex-1 min-w-0">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="transition-opacity duration-300"
              style={{
                opacity: i === activeIndex ? 1 : 0,
                pointerEvents: i === activeIndex ? 'auto' : 'none',
                ...(i === activeIndex ? { position: 'relative' } : { position: 'absolute', inset: 0 }),
              }}
            >
              <TiltCard card={card} />
            </div>
          ))}
        </div>

        <NavArrow dir="right" disabled={activeIndex === cards.length - 1} onClick={onNext} />
      </div>

      <div className="flex gap-2 mt-6 pointer-events-none">
        {cards.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 28 : 8,
              background: i === activeIndex ? '#22c55e' : 'rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
