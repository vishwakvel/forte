import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Disc3, Home, LogOut, Music2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/rate', icon: Sparkles, label: 'Rate' },
  { to: '/collection', icon: Disc3, label: 'Collection' },
  { to: '/artists', icon: Music2, label: 'Artists' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const isRate = pathname === '/rate';

  return (
    <div className="mesh-bg h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 z-50 glass-strong border-b border-white/8 group/nav">
        <div className="flex items-center px-4 h-14 group-hover/nav:h-[4.25rem] transition-[height] duration-300 ease-out gap-4">
          <Link to="/" className="shrink-0">
            <span className="font-display text-xl font-semibold text-gradient">Forte</span>
          </Link>

          <nav className="flex-1 flex justify-center items-center gap-1">
            {NAV.map(({ to, icon: Icon, label }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={clsx(
                    'flex items-center gap-0 group-hover/nav:gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer overflow-hidden',
                    active
                      ? 'bg-accent/15 text-accent border border-accent/25'
                      : 'text-muted hover:text-text hover:bg-white/5 border border-transparent',
                  )}
                >
                  <Icon className={clsx('w-5 h-5 shrink-0', active && 'text-accent')} />
                  <span className="max-w-0 opacity-0 group-hover/nav:max-w-[6rem] group-hover/nav:opacity-100 whitespace-nowrap transition-all duration-300 overflow-hidden">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="flex items-center gap-2 shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full ring-2 ring-accent/20" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs">
                  {user.display_name?.[0]}
                </div>
              )}
              <button
                type="button"
                onClick={logout}
                className="p-2 text-muted hover:text-text hover:bg-white/5 rounded-lg transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={clsx('flex-1 min-h-0', isRate ? 'overflow-hidden' : 'overflow-auto')}>
        <div className={clsx(
          'mx-auto h-full',
          isRate ? 'max-w-6xl px-4 py-3' : 'max-w-6xl p-6 md:p-10',
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
