import { useEffect, useState, type RefObject } from 'react';

/** 0→1 progress through a tall scroll track (`ref` height − viewport). */
export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const scrollable = el.offsetHeight - window.innerHeight;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      const y = window.scrollY - top;
      setProgress(Math.min(1, Math.max(0, y / scrollable)));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref]);

  return progress;
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Map global progress into a local 0→1 window. */
export function segment(progress: number, start: number, end: number) {
  if (end <= start) return 0;
  return clamp01((progress - start) / (end - start));
}
