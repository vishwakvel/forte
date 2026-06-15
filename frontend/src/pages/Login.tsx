import {
  BarChart3,
  GitCompareArrows,
  Layers,
  Radio,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const FEATURES = [
  {
    icon: GitCompareArrows,
    title: 'Head-to-head ratings',
    desc: 'Place a song in Fire, Solid, or Skip — then duel it against your library. ELO sorts the truth.',
  },
  {
    icon: TrendingUp,
    title: 'A score that means something',
    desc: 'Every comparison shifts your rankings. Not vibes — a real 0–10 score built from your picks.',
  },
  {
    icon: BarChart3,
    title: 'Taste over time',
    desc: '3D taste map, similarity-based predictions, and graph-theory consistency checks on your ratings.',
  },
  {
    icon: Layers,
    title: 'Your music, your way in',
    desc: 'Rate from what\'s playing now, recent history, playlists, or search — no typing required.',
  },
];

const STEPS = [
  { n: '01', label: 'Connect Spotify', detail: 'One tap. We pull your catalog — never posts for you.' },
  { n: '02', label: 'Rate tracks', detail: 'Bucket + quick comparisons. Smart pairing, stops when it\'s obvious.' },
  { n: '03', label: 'See your taste', detail: 'Top songs, favorite artists, and ML insights as your library grows.' },
];

export function Login() {
  return (
    <div className="mesh-bg min-h-screen text-text overflow-x-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[15%] w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[100px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[10%] w-[24rem] h-[24rem] rounded-full bg-accent/15 blur-[90px] animate-float-slower" />
        <div className="absolute top-[50%] left-[55%] w-64 h-64 rounded-full bg-rose-500/10 blur-[80px] animate-float-slow" style={{ animationDelay: '-5s' }} />
      </div>

      {/* Hero */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 pt-16 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/10 text-xs text-muted mb-8 animate-fade-up">
            <Radio className="w-3.5 h-3.5 text-accent" />
            Music taste engine
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-semibold tracking-tight animate-fade-up stagger-1">
            <span className="text-gradient">Forte</span>
          </h1>

          <p className="mt-6 text-xl md:text-2xl text-muted font-light leading-relaxed max-w-xl mx-auto animate-fade-up stagger-2">
            Rank every song. Build a taste profile that&apos;s actually{' '}
            <em className="text-text not-italic font-normal">yours</em>.
          </p>

          <p className="mt-4 text-sm text-muted/80 max-w-md mx-auto animate-fade-up stagger-3">
            Beli-style comparisons meet Spotify. ELO rankings, artist leaderboards, and ML-powered taste insights — desktop-first, zero fluff.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-4">
            <a
              href="/api/auth/login"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-semibold rounded-full hover:scale-[1.03] transition-all duration-300 glow-green cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Connect with Spotify
            </a>
            <a href="#how" className="text-sm text-muted hover:text-text transition cursor-pointer">
              See how it works ↓
            </a>
          </div>
        </div>

        {/* Decorative score preview */}
        <div className="mt-16 w-full max-w-lg mx-auto animate-fade-up stagger-5">
          <div className="glass rounded-2xl p-5 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 landing-shimmer opacity-50 pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">Blinding Lights</p>
                <p className="text-xs text-muted">The Weeknd</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-semibold text-accent">8.4</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">Fire</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section className="relative px-6 py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4">
            More than a playlist
          </h2>
          <p className="text-muted text-center max-w-lg mx-auto mb-14">
            Forte turns subjective taste into a ranked library you can explore, compare, and understand.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/15 border border-transparent transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-medium text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative px-6 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-center mb-14">How it works</h2>
          <div className="space-y-8">
            {STEPS.map(({ n, label, detail }) => (
              <div key={n} className="flex gap-6 items-start">
                <span className="font-display text-3xl text-accent/40 font-semibold tabular-nums shrink-0 w-12">
                  {n}
                </span>
                <div>
                  <h3 className="font-medium text-lg">{label}</h3>
                  <p className="text-muted text-sm mt-1 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">
            Ready to rank your library?
          </h2>
          <p className="text-muted text-sm mb-8">
            Free to use. Your data stays yours. Built for people who care how music actually stacks up.
          </p>
          <a
            href="/api/auth/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-semibold rounded-full hover:scale-[1.03] transition-all duration-300 glow-green cursor-pointer"
          >
            Get started with Spotify
          </a>
        </div>
        <p className="text-center text-[10px] text-muted/50 mt-16">
          Forte · Not affiliated with Spotify
        </p>
      </section>
    </div>
  );
}
