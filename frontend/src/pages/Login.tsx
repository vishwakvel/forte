import { Headphones } from 'lucide-react';

export function Login() {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative text-center max-w-lg animate-fade-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass border border-white/10 mb-8 glow-green">
          <Headphones className="w-10 h-10 text-accent" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-semibold text-gradient mb-4">
          Forte
        </h1>
        <p className="text-muted text-lg leading-relaxed mb-2">
          Rank your music. Map your taste. Watch it evolve.
        </p>
        <p className="text-muted/60 text-sm mb-10">
          ELO-powered ratings · ML taste insights · Spotify catalog
        </p>
        <a
          href="/api/auth/login"
          className="inline-flex items-center gap-3 px-10 py-4 bg-accent text-bg font-semibold rounded-full hover:scale-105 hover:bg-accent/90 transition-all duration-300 glow-green"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Connect with Spotify
        </a>
      </div>
    </div>
  );
}
