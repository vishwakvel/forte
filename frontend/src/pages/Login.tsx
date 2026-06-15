import { useRef, useState } from 'react';
import { LandingHowCarousel, type HowCard } from '../components/LandingHowCarousel';
import { LandingVinylHero, useVinylScrollGate } from '../components/LandingVinylHero';
import { segment, useScrollProgress } from '../hooks/useScrollProgress';

const PHRASES = [
  'song against song.',
  'scores that stick.',
  'taste you can see.',
];

const ABOUT =
  'Forte ranks your Spotify library the way you actually listen. Bucket tracks as Fire, Solid, or Skip, pit them against each other, and build real scores, genre maps, and taste insights from your own picks.';

const HOW_CARDS: HowCard[] = [
  {
    image: '/images/forte-card-connect.png',
    label: 'Step one',
    title: 'Connect Spotify',
    body: 'One tap to link your account. We read your library and top artists. Nothing gets posted.',
    tags: ['OAuth', 'Read-only', 'Private'],
  },
  {
    image: '/images/forte-card-rate-v2.png',
    label: 'Step two',
    title: 'Rate and duel',
    body: 'Place every track in a bucket, then pick winners head to head. Your ELO score settles from those choices.',
    tags: ['Fire · Solid · Skip', 'Smart pairing', 'Adaptive scoring'],
  },
  {
    image: '/images/forte-card-insights-v2.png',
    label: 'Step three',
    title: 'See your taste',
    body: 'Rankings, 3D taste maps, and genre graphs built from how you rank music, not what you stream most.',
    tags: ['Taste map', 'Rankings', 'Predictions'],
  },
];

function phraseMotion(progress: number, index: number) {
  const start = 0.11 + index * 0.075;
  const enterEnd = start + 0.024;
  const exitStart = start + 0.048;
  const exitEnd = start + 0.072;

  if (progress < start) return { opacity: 0, y: 120, rotateX: 78, scale: 0.92 };
  if (progress < enterEnd) {
    const t = (progress - start) / (enterEnd - start);
    const ease = 1 - (1 - t) ** 3;
    return {
      opacity: ease,
      y: 120 * (1 - ease),
      rotateX: 78 * (1 - ease),
      scale: 0.92 + ease * 0.08,
    };
  }
  if (progress < exitStart) return { opacity: 1, y: 0, rotateX: 0, scale: 1 };
  if (progress < exitEnd) {
    const t = (progress - exitStart) / (exitEnd - exitStart);
    return {
      opacity: 1 - t,
      y: -80 * t,
      rotateX: -35 * t,
      scale: 1 - t * 0.04,
    };
  }
  return { opacity: 0, y: -80, rotateX: -35, scale: 0.96 };
}

function DustWord({
  word,
  progress,
  index,
  total,
}: {
  word: string;
  progress: number;
  index: number;
  total: number;
}) {
  const stagger = total + 1.5;
  const local = Math.min(1, Math.max(0, (progress * stagger - index) / 1.8));
  const blur = (1 - local) * 8;
  const y = (1 - local) * 14;

  return (
    <span className="landing-dust-word inline-block mr-[0.28em] last:mr-0">
      <span
        style={{
          opacity: local,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
          transform: `translateY(${y}px) scale(${0.94 + local * 0.06})`,
          display: 'inline-block',
        }}
      >
        {word}
      </span>
    </span>
  );
}

export function Login() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(trackRef);
  const [cardIndex, setCardIndex] = useState(0);
  const [vinylOpen, setVinylOpen] = useState(false);

  useVinylScrollGate(vinylOpen);

  const toggleVinyl = () => {
    setVinylOpen((open) => {
      if (open) window.scrollTo(0, 0);
      return !open;
    });
  };

  const curtain = segment(progress, 0.05, 0.13);
  const heroOpacity = vinylOpen ? 1 - segment(progress, 0.04, 0.12) : 1;

  const aboutWordProgress = segment(progress, 0.36, 0.53);
  const aboutOpacity = segment(progress, 0.34, 0.38) * (1 - segment(progress, 0.53, 0.57));
  const words = ABOUT.split(/\s+/);

  return (
    <div className="landing-root bg-[#eceae4] text-[#0a0a0a] min-h-[100dvh]">
      <nav className="landing-nav-shell fixed top-0 inset-x-0 z-[60] flex items-center justify-between px-6 md:px-12 py-5 md:py-6">
        <span className="landing-display text-sm md:text-base font-semibold tracking-[0.22em] uppercase">
          Forte
        </span>
        <ConnectSpotifyButton />
      </nav>

      <div ref={trackRef} className="relative" style={{ height: '650vh' }}>
        <div className="sticky top-0 h-[100dvh] w-full overflow-hidden landing-light-bg">
          <LandingVinylHero open={vinylOpen} onToggle={toggleVinyl} opacity={heroOpacity} />

          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-[#eceae4] z-[25] pointer-events-none will-change-transform"
            style={{
              transform: `translateX(${(1 - curtain) * -100}%)`,
              opacity: vinylOpen ? 1 : 0,
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-1/2 bg-[#eceae4] z-[25] pointer-events-none will-change-transform"
            style={{
              transform: `translateX(${(1 - curtain) * 100}%)`,
              opacity: vinylOpen ? 1 : 0,
            }}
          />

          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[35]"
            style={{ perspective: '900px', opacity: vinylOpen ? 1 : 0 }}
          >
            {PHRASES.map((phrase, i) => {
              const m = phraseMotion(progress, i);
              if (m.opacity <= 0.01) return null;
              return (
                <p
                  key={phrase}
                  className="landing-phrase absolute text-center px-6 max-w-4xl"
                  style={{
                    opacity: m.opacity,
                    transform: `rotateX(${m.rotateX}deg) translateY(${m.y}px) scale(${m.scale})`,
                    transformOrigin: 'center bottom',
                  }}
                >
                  {phrase}
                </p>
              );
            })}
          </div>

          <div
            id="story"
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 md:px-16 max-w-3xl mx-auto z-[35] pointer-events-none"
            style={{ opacity: vinylOpen ? aboutOpacity : 0 }}
          >
            <p className="landing-display text-2xl md:text-[2.2rem] leading-snug md:leading-tight text-[#0a0a0a] font-normal tracking-tight">
              {words.map((word, i) => (
                <DustWord key={i} word={word} progress={aboutWordProgress} index={i} total={words.length} />
              ))}
            </p>
          </div>

          {vinylOpen && (
            <LandingHowCarousel
              progress={progress}
              cards={HOW_CARDS}
              activeIndex={cardIndex}
              onPrev={() => setCardIndex((i) => Math.max(0, i - 1))}
              onNext={() => setCardIndex((i) => Math.min(HOW_CARDS.length - 1, i + 1))}
            />
          )}
        </div>
      </div>

      <footer className="relative z-10 py-10 text-center text-[10px] tracking-[0.2em] uppercase text-[#8a8a85] bg-[#eceae4] border-t border-black/[0.06]">
        Forte · Not affiliated with Spotify
      </footer>
    </div>
  );
}

function ConnectSpotifyButton() {
  return (
    <a
      href="/api/auth/login"
      className="landing-display inline-flex items-center gap-2.5 text-[10px] md:text-xs px-5 md:px-6 py-2.5 md:py-3 rounded-full font-semibold tracking-[0.12em] uppercase bg-[#0a0a0a] text-[#eceae4] hover:scale-[1.02] transition cursor-pointer whitespace-nowrap"
    >
      <SpotifyIcon />
      Connect with Spotify
    </a>
  );
}

function SpotifyIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" />
    </svg>
  );
}
