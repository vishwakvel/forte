import { useEffect } from 'react';

interface LandingVinylHeroProps {
  open: boolean;
  onToggle: () => void;
  opacity: number;
}

export function LandingVinylHero({ open, onToggle, opacity }: LandingVinylHeroProps) {
  return (
    <div
      className="landing-vinyl-stage absolute inset-0 z-[8] flex items-center justify-center"
      style={{ opacity, pointerEvents: opacity < 0.08 ? 'none' : 'auto' }}
    >
      <div className={`landing-vinyl-album ${open ? 'is-open' : ''}`}>
        <div className="landing-vinyl-disc-track" aria-hidden>
          <div className="landing-vinyl-disc-face">
            <img src="/images/forte-vinyl-disc.png" alt="" className="landing-vinyl-disc-img" draggable={false} />
            <div className="landing-vinyl-spindle" />
          </div>
        </div>

        <div className="landing-vinyl-cover-wrap">
          <div className="landing-vinyl-cover" aria-hidden>
            <img src="/images/forte-vinyl-cover-v2.png" alt="" draggable={false} />
            <span className="landing-vinyl-cover-shine" />
          </div>
          <button
            type="button"
            className="landing-vinyl-cover-hit"
            onClick={onToggle}
            aria-label={open ? 'Close album' : 'Open album'}
          />
        </div>
      </div>

      <p className="landing-vinyl-hint absolute bottom-[12vh] text-[11px] tracking-[0.22em] uppercase text-[#6b6b66] font-semibold pointer-events-none">
        {open ? 'Tap cover to close' : 'Tap cover to open'}
      </p>
    </div>
  );
}

/** Block page scroll while the vinyl is closed. */
export function useVinylScrollGate(vinylOpen: boolean) {
  useEffect(() => {
    if (vinylOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [vinylOpen]);
}
