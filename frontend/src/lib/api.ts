const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('forte_token');
}

export { getToken };

export function setToken(token: string) {
  localStorage.setItem('forte_token', token);
}

export function clearToken() {
  localStorage.removeItem('forte_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const msg = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).join(', ')
        : `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export interface Song {
  spotify_id: string;
  title: string;
  artist: string;
  artists?: string[];
  album?: string;
  album_art?: string;
  duration_ms?: number;
  spotify_popularity?: number;
  played_at?: string;
  is_playing?: boolean;
}

export interface Rating {
  id: string;
  song_id: string;
  elo: number;
  display_score: number;
  bucket: 'fire' | 'solid' | 'skip';
  comparison_count: number;
  created_at: string;
  updated_at: string;
  songs?: Song & { id: string; audio_features?: Record<string, number> };
  song?: Song & { id: string; audio_features?: Record<string, number> };
}

export interface User {
  id: string;
  display_name: string;
  avatar_url?: string;
}
