import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setToken } from '../lib/api';

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="mesh-bg min-h-screen flex flex-col items-center justify-center gap-4 animate-fade-up">
      <p className="landing-display text-sm tracking-[0.22em] uppercase text-text font-semibold">Forte</p>
      <div className="w-6 h-6 border-2 border-black/10 border-t-accent rounded-full animate-spin" />
      <p className="text-sm text-muted">Connecting your Spotify…</p>
    </div>
  );
}
