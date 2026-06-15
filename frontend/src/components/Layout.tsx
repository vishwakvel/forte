import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Disc3, Home, LogOut, Music2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/rate', icon: Sparkles, label: 'Rate' },
  { to: '/collection', icon: Disc3, label: 'Collection' },
  { to: '/artists', icon: Music2, label: 'Rankings' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const isRate = pathname === '/rate';

  return (
    <div className="mesh-bg h-screen flex flex-col overflow-hidden">
      <header className="landing-nav-shell shrink-0 z-50">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 md:px-10 h-[4.25rem]">
          <Link to="/" className="landing-display text-sm md:text-base font-semibold tracking-[0.22em] uppercase text-text hover:opacity-70 transition">
            Forte
          </Link>

          <nav className="flex items-center gap-0.5 md:gap-1 justify-self-center">
            {NAV.map(({ to, icon: Icon, label }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={clsx(
                    'inline-flex items-center gap-2 px-2.5 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold tracking-wide transition cursor-pointer',
                    active
                      ? 'bg-text text-white shadow-sm'
                      : 'text-muted hover:text-text hover:bg-black/[0.04]',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="flex items-center gap-2 justify-self-end">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full ring-2 ring-black/[0.08]" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center text-xs font-semibold">
                  {user.display_name?.[0]}
                </div>
              )}
              <button
                type="button"
                onClick={logout}
                className="p-2 text-muted hover:text-text hover:bg-black/[0.04] rounded-full transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span />
          )}
        </div>
      </header>

      <main className={clsx('flex-1 min-h-0', isRate ? 'overflow-hidden' : 'overflow-auto')}>
        <div className={clsx(
          'mx-auto h-full',
          isRate ? 'max-w-6xl px-4 py-3' : 'max-w-6xl px-5 md:px-10 py-8 md:py-10',
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
