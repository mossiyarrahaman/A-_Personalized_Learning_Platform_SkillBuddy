import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Brain, BarChart, Globe, Zap, Palette, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Theme & Accent Definitions ───────────────────────────────────────────────
const THEMES = {
    dark: {
        label: 'Dark', icon: '🌙',
        bg: '#0d0b1a',
        sec1: '#0a0818',   // Features  — slightly lighter
        sec2: '#0d0b1a',   // How it Works
        sec3: '#080614',   // CTA       — darker
        heroFrom: '#13102a', heroVia: '#1e1545', heroTo: '#110e26',
        surface: 'rgba(255,255,255,0.05)', surfaceHover: 'rgba(255,255,255,0.09)',
        border: 'rgba(255,255,255,0.09)', textPrimary: '#f0eeff',
        textSecondary: '#9b97b8', textMuted: '#5a5670', footer: '#06040f',
    },
    light: {
        label: 'Light', icon: '☀️',
        bg: '#f5f4ff',
        sec1: '#ffffff',
        sec2: '#eeedfb',
        sec3: '#e6e4fa',
        heroFrom: '#eceaff', heroVia: '#e0deff', heroTo: '#e8e4ff',
        surface: 'rgba(0,0,0,0.04)', surfaceHover: 'rgba(0,0,0,0.08)',
        border: 'rgba(0,0,0,0.1)', textPrimary: '#0d0c1f',
        textSecondary: '#4a4670', textMuted: '#9590b8', footer: '#dddcf5',
    },
    midnight: {
        label: 'Midnight', icon: '🌌',
        bg: '#000814',
        sec1: '#00101f',
        sec2: '#000814',
        sec3: '#00060f',
        heroFrom: '#000814', heroVia: '#001d3d', heroTo: '#000814',
        surface: 'rgba(0,180,255,0.05)', surfaceHover: 'rgba(0,180,255,0.1)',
        border: 'rgba(0,180,255,0.12)', textPrimary: '#caf0f8',
        textSecondary: '#5fa8c4', textMuted: '#2a5c70', footer: '#000510',
    },
    forest: {
        label: 'Forest', icon: '🌿',
        bg: '#050f0a',
        sec1: '#071510',
        sec2: '#050f0a',
        sec3: '#030a07',
        heroFrom: '#071410', heroVia: '#0d2318', heroTo: '#071410',
        surface: 'rgba(16,185,129,0.05)', surfaceHover: 'rgba(16,185,129,0.1)',
        border: 'rgba(16,185,129,0.12)', textPrimary: '#d1fae5',
        textSecondary: '#6ee7b7', textMuted: '#2a6e55', footer: '#030a07',
    },
    aurora: {
        label: 'Aurora', icon: '🌅',
        bg: '#0f0520',
        sec1: '#160830',
        sec2: '#0f0520',
        sec3: '#0a0318',
        heroFrom: '#150830', heroVia: '#1a0a28', heroTo: '#0f0520',
        surface: 'rgba(251,113,133,0.05)', surfaceHover: 'rgba(251,113,133,0.1)',
        border: 'rgba(251,113,133,0.12)', textPrimary: '#fce7f3',
        textSecondary: '#f9a8d4', textMuted: '#7c2d5e', footer: '#0a0318',
    },
};

const ACCENTS = {
    violet: { from: '#7c3aed', to: '#4f46e5', glow: 'rgba(124,58,237,0.4)', name: 'Violet' },
    blue: { from: '#2563eb', to: '#0284c7', glow: 'rgba(37,99,235,0.4)', name: 'Blue' },
    teal: { from: '#0d9488', to: '#059669', glow: 'rgba(13,148,136,0.4)', name: 'Teal' },
    rose: { from: '#e11d48', to: '#db2777', glow: 'rgba(225,29,72,0.4)', name: 'Rose' },
    amber: { from: '#d97706', to: '#ea580c', glow: 'rgba(217,119,6,0.4)', name: 'Amber' },
    lime: { from: '#65a30d', to: '#16a34a', glow: 'rgba(101,163,13,0.4)', name: 'Lime' },
};

const useTheme = () => {
    const [themeName, setThemeName] = useState(() => { try { return localStorage.getItem('sb-theme') || 'dark'; } catch { return 'dark'; } });
    const [accentName, setAccentName] = useState(() => { try { return localStorage.getItem('sb-accent') || 'violet'; } catch { return 'violet'; } });
    const setTheme = useCallback((n) => { setThemeName(n); try { localStorage.setItem('sb-theme', n); } catch { } }, []);
    const setAccent = useCallback((n) => { setAccentName(n); try { localStorage.setItem('sb-accent', n); } catch { } }, []);
    return { theme: THEMES[themeName] || THEMES.dark, themeName, accent: ACCENTS[accentName] || ACCENTS.violet, accentName, setTheme, setAccent };
};

// ─── Gradient Text — uses a className trick to avoid inline WebkitTextFillColor bug ──
const GradientText = ({ from, to, children, size }) => (
    <span style={{ fontSize: size, display: 'inline' }}>
        <span className="sb-grad-text" style={{ '--g-from': from, '--g-to': to }}>
            {children}
        </span>
    </span>
);

// ─── Global style injector ─────────────────────────────────────────────────────
const GlobalStyles = ({ accent }) => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
    .sb-grad-text {
      background: linear-gradient(135deg, var(--g-from), var(--g-to));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
      display: inline;
    }
    .sb-btn-primary {
      background: linear-gradient(135deg, ${accent.from}, ${accent.to});
      box-shadow: 0 8px 28px ${accent.glow};
      border: none; border-radius: 12px;
      padding: 13px 28px; color: #fff;
      font-weight: 700; font-size: 1rem;
      cursor: pointer; transition: transform .2s, box-shadow .2s;
      display: inline-flex; align-items: center; gap: 8px;
      font-family: 'DM Sans', sans-serif;
    }
    .sb-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px ${accent.glow}; }
    .sb-btn-secondary {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px; padding: 13px 28px;
      color: #f0eeff; font-weight: 600; font-size: 1rem;
      cursor: pointer; transition: background .2s;
      display: inline-flex; align-items: center; gap: 8px;
      font-family: 'DM Sans', sans-serif;
    }
    .sb-btn-secondary:hover { background: rgba(255,255,255,0.1); }
    .sb-card { transition: transform .25s, border-color .25s, background .25s; }
    .sb-card:hover { transform: translateY(-5px); }
    .sb-step-circle { transition: border-color .3s, box-shadow .3s; }
    .sb-step-circle:hover { box-shadow: 0 0 28px ${accent.glow}; border-color: ${accent.from} !important; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
  `}</style>
);

// ─── Theme Panel ──────────────────────────────────────────────────────────────
const ThemePanel = ({ open, onClose, theme, themeName, accent, accentName, setTheme, setAccent }) => {
    if (!open) return null;
    const panelBg = theme.bg === '#f5f4ff' ? '#fff' : '#13102a';
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: panelBg, border: `1px solid ${theme.border}`, borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: `0 0 80px ${accent.glow}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                    <div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '1.15rem', color: theme.textPrimary }}>Customize Theme</div>
                        <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginTop: '3px' }}>Changes apply live across the app</div>
                    </div>
                    <button onClick={onClose} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '0.4rem', color: theme.textSecondary, cursor: 'pointer', display: 'flex' }}><X size={17} /></button>
                </div>

                <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Theme Mode</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
                        {Object.entries(THEMES).map(([key, t]) => (
                            <button key={key} onClick={() => setTheme(key)} style={{ padding: '0.65rem 0.3rem', borderRadius: '0.75rem', border: `2px solid ${themeName === key ? accent.from : theme.border}`, background: themeName === key ? `${accent.from}22` : theme.surface, cursor: 'pointer', textAlign: 'center', transition: 'all .2s' }}>
                                <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{t.icon}</div>
                                <div style={{ fontSize: '0.63rem', color: themeName === key ? accent.from : theme.textSecondary, marginTop: '4px', fontWeight: 600 }}>{t.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Accent Color</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {Object.entries(ACCENTS).map(([key, a]) => (
                            <button key={key} onClick={() => setAccent(key)} title={a.name} style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg,${a.from},${a.to})`, border: `3px solid ${accentName === key ? theme.textPrimary : 'transparent'}`, cursor: 'pointer', transition: 'all .2s', boxShadow: accentName === key ? `0 0 14px ${a.glow}` : 'none', transform: accentName === key ? 'scale(1.18)' : 'scale(1)' }} />
                        ))}
                    </div>
                </div>

                <div style={{ padding: '0.75rem 1rem', background: `${accent.from}15`, border: `1px solid ${accent.from}35`, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent.from, boxShadow: `0 0 8px ${accent.glow}`, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: theme.textSecondary }}>Changes apply instantly — no page reload needed</span>
                </div>
            </div>
        </div>
    );
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
const Logo = ({ theme }) => (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none' }}>
        <Brain style={{ width: '26px', height: '26px', color: '#a78bfa' }} />
        <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: '1.25rem', color: theme.textPrimary, letterSpacing: '-0.02em' }}>SkillBuddy</span>
    </Link>
);

// ─── Section Divider ──────────────────────────────────────────────────────────
const SectionDivider = ({ accent }) => (
    <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${accent.from}50, ${accent.to}50, transparent)` }} />
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, themeName, accent, accentName, setTheme, setAccent } = useTheme();
    const [themeOpen, setThemeOpen] = useState(false);

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans',sans-serif", transition: 'background .4s, color .4s' }}>
            <GlobalStyles accent={accent} />
            <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} theme={theme} themeName={themeName} accent={accent} accentName={accentName} setTheme={setTheme} setAccent={setAccent} />

            {/* ── HERO ── */}
            <div style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroVia} 50%, ${theme.heroTo})`, position: 'relative', overflow: 'hidden' }}>
                {/* Glow orbs */}
                <div style={{ position: 'absolute', top: '-15%', left: '-8%', width: '45%', height: '65%', background: `${accent.from}15`, borderRadius: '50%', filter: 'blur(110px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: '40%', height: '55%', background: `${accent.to}10`, borderRadius: '50%', filter: 'blur(130px)', pointerEvents: 'none' }} />

                {/* Nav */}
                <nav style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
                    <Logo theme={theme} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            {[['#features', 'Features'], ['#how-it-works', 'How it Works'], ['#pricing', 'Pricing']].map(([href, label]) => (
                                <a key={href} href={href} style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color .2s' }}
                                    onMouseEnter={e => e.target.style.color = accent.from} onMouseLeave={e => e.target.style.color = theme.textSecondary}>{label}</a>
                            ))}
                        </div>
                        <button onClick={() => setThemeOpen(true)} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '0.6rem', padding: '0.45rem 0.85rem', cursor: 'pointer', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 500, transition: 'all .2s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}>
                            <Palette size={14} /> Theme
                        </button>
                        {user ? (
                            <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '2rem', padding: '0.35rem 1rem 0.35rem 0.35rem', cursor: 'pointer', transition: 'all .2s' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg,${accent.from},${accent.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                                    {user.name ? user.name[0].toUpperCase() : 'U'}
                                </div>
                                <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '0.85rem' }}>{user.name}</span>
                            </button>
                        ) : (
                            <button onClick={() => navigate('/login')} style={{ background: `linear-gradient(135deg,${accent.from},${accent.to})`, border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.4rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: `0 4px 20px ${accent.glow}`, transition: 'all .2s' }}>
                                Sign In
                            </button>
                        )}
                    </div>
                </nav>

                {/* Hero Content */}
                <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '5rem 2rem 8rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    {/* Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${accent.from}18`, border: `1px solid ${accent.from}50`, borderRadius: '2rem', padding: '0.35rem 1rem', marginBottom: '1.75rem', fontSize: '0.78rem', fontWeight: 700, color: accent.from, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <Zap size={12} /> The Future of Personalized Learning
                    </div>

                    {/* ✅ FIX: gradient text uses CSS class, not inline WebkitTextFillColor */}
                    <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(2.6rem,7vw,5.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.5rem', color: theme.textPrimary }}>
                        Learn Smarter,{' '}
                        <GradientText from={accent.from} to={accent.to}>Not Harder</GradientText>
                    </h1>

                    <p style={{ fontSize: '1.1rem', color: theme.textSecondary, maxWidth: '580px', margin: '0 auto 2.5rem', lineHeight: 1.75, fontWeight: 400 }}>
                        Experience truly personalized learning with AI-powered courses, real-time progress tracking, and adaptive content that evolves with your learning style.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '5rem' }}>
                        <button onClick={() => navigate(user ? '/dashboard' : '/register')} className="sb-btn-primary">
                            {user ? 'Go into Dashboard' : 'Start Learning Free'} <ChevronRight size={18} />
                        </button>
                        <button className="sb-btn-secondary">
                            <Play size={16} style={{ fill: 'currentColor' }} /> Watch Demo
                        </button>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', maxWidth: '860px', margin: '0 auto' }}>
                        {[['50K+', 'Active Learners'], ['200+', 'Courses Available'], ['95%', 'Success Rate'], ['24/7', 'AI Support']].map(([val, label], i) => (
                            <div key={i} className="sb-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '1.25rem', padding: '1.5rem 1rem', backdropFilter: 'blur(12px)' }}>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.8rem', fontWeight: 800, color: theme.textPrimary }}>{val}</div>
                                <div style={{ fontSize: '0.78rem', color: theme.textSecondary, fontWeight: 500, marginTop: '2px' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </main>
                {/* bottom blend into features */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: `linear-gradient(to top,${theme.sec1},transparent)`, pointerEvents: 'none' }} />
            </div>

            {/* ── FEATURES ── distinct background sec1 */}
            <SectionDivider accent={accent} />
            <section id="features" style={{ padding: '6rem 2rem', background: theme.sec1, position: 'relative' }}>
                {/* subtle radial glow */}
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: `${accent.from}08`, borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div style={{ display: 'inline-block', background: `${accent.from}15`, border: `1px solid ${accent.from}35`, borderRadius: '2rem', padding: '0.3rem 1rem', marginBottom: '1rem', fontSize: '0.72rem', fontWeight: 700, color: accent.from, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Why SkillBuddy</div>
                        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, marginBottom: '1rem', color: theme.textPrimary }}>Built Different, Built Better</h2>
                        <p style={{ color: theme.textSecondary, maxWidth: '500px', margin: '0 auto', lineHeight: 1.7, fontSize: '0.95rem' }}>Our platform combines cutting-edge AI with proven pedagogy to create the ultimate learning experience.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
                        {[
                            { Icon: Brain, title: 'AI-Powered Personalization', desc: 'Our AI analyzes your learning patterns and adapts content difficulty, pace, and style to match your unique needs.' },
                            { Icon: BarChart, title: 'Real-Time Progress Tracking', desc: 'Monitor your learning journey with detailed analytics, identifying strengths and areas for improvement instantly.' },
                            { Icon: Globe, title: 'Multi-Language Support', desc: 'Learn in your native language with real-time translation of text and video content for deeper understanding.' },
                        ].map(({ Icon, title, desc }, i) => (
                            <div key={i} className="sb-card" style={{ padding: '2rem', borderRadius: '1.5rem', background: theme.surface, border: `1px solid ${theme.border}` }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: `${accent.from}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                    <Icon style={{ width: '24px', height: '24px', color: accent.from }} />
                                </div>
                                <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.75rem', color: theme.textPrimary }}>{title}</h3>
                                <p style={{ color: theme.textSecondary, lineHeight: 1.7, fontSize: '0.9rem' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── distinct background sec2 */}
            <SectionDivider accent={accent} />
            <section id="how-it-works" style={{ padding: '6rem 2rem', background: theme.sec2, position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, right: '20%', width: '400px', height: '300px', background: `${accent.to}06`, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <div style={{ display: 'inline-block', background: `${accent.from}15`, border: `1px solid ${accent.from}35`, borderRadius: '2rem', padding: '0.3rem 1rem', marginBottom: '1rem', fontSize: '0.72rem', fontWeight: 700, color: accent.from, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Process</div>
                        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, marginBottom: '1rem', color: theme.textPrimary }}>How It Works</h2>
                        <p style={{ color: theme.textSecondary }}>Get started in minutes with our simple, powerful process.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2rem', position: 'relative' }}>
                        {/* connector line */}
                        <div style={{ position: 'absolute', top: '56px', left: '12%', right: '12%', height: '1px', background: `linear-gradient(to right, transparent, ${accent.from}50, ${accent.to}50, transparent)` }} />
                        {[
                            ['01', 'Choose Your Field', 'Select from programming, design, business, and more.'],
                            ['02', 'Take Assessment', 'Answer 5–10 questions to determine your current level.'],
                            ['03', 'Get Custom Plan', 'Receive a personalized learning path tailored to your needs.'],
                            ['04', 'Start Learning', 'Begin with adaptive content and real-time feedback.'],
                        ].map(([num, title, desc]) => (
                            <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                                <div className="sb-step-circle" style={{ width: '88px', height: '88px', borderRadius: '50%', background: theme.surface, border: `2px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    {/* ✅ FIX: step numbers use CSS class too */}
                                    <span className="sb-grad-text" style={{ '--g-from': accent.from, '--g-to': accent.to, fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: '1.5rem' }}>{num}</span>
                                </div>
                                <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: theme.textPrimary }}>{title}</h3>
                                <p style={{ fontSize: '0.85rem', color: theme.textSecondary, lineHeight: 1.6 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── distinct background sec3 (darkest) */}
            <SectionDivider accent={accent} />
            <section style={{ padding: '7rem 2rem', background: theme.sec3, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${accent.from}10, transparent 65%)`, pointerEvents: 'none' }} />
                {/* decorative rings */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', borderRadius: '50%', border: `1px solid ${accent.from}12`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '700px', borderRadius: '50%', border: `1px solid ${accent.from}08`, pointerEvents: 'none' }} />
                <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1.15, marginBottom: '1.25rem', color: theme.textPrimary }}>
                        Ready to{' '}
                        <GradientText from={accent.from} to={accent.to}>Transform</GradientText>
                        {' '}Your Learning?
                    </h2>
                    <p style={{ fontSize: '1.05rem', color: theme.textSecondary, marginBottom: '2.5rem', lineHeight: 1.7 }}>
                        Join thousands of learners already experiencing personalized education tailored just for them.
                    </p>
                    <button onClick={() => navigate('/register')} className="sb-btn-primary" style={{ fontSize: '1.05rem', padding: '14px 36px' }}>
                        Get Started Today
                    </button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <SectionDivider accent={accent} />
            <footer style={{ background: theme.footer, padding: '4rem 2rem 2rem' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
                        <div>
                            <Logo theme={theme} />
                            <p style={{ color: theme.textMuted, marginTop: '1rem', fontSize: '0.875rem', lineHeight: 1.7 }}>Empowering learners worldwide with AI-driven personalized education.</p>
                        </div>
                        {[
                            { h: 'Platform', l: ['Features', 'Pricing', 'API'] },
                            { h: 'Support', l: ['Help Center', 'Contact', 'Community'] },
                            { h: 'Company', l: ['About', 'Blog', 'Careers'] },
                        ].map(({ h, l }) => (
                            <div key={h}>
                                <div style={{ fontWeight: 700, marginBottom: '1.25rem', color: theme.textPrimary, fontSize: '0.9rem' }}>{h}</div>
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {l.map(link => (
                                        <li key={link}><a href="#" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: '0.875rem', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = accent.from} onMouseLeave={e => e.target.style.color = theme.textMuted}>{link}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: theme.textMuted }}>
                        © {new Date().getFullYear()} SkillBuddy. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;