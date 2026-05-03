import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Flame, Shield, Star, Zap, Target, Crown, TrendingUp, RefreshCw, BookOpen } from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const Leaderboard = () => {
    const { theme, accent } = useAppTheme();
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all | streak | badges

    useEffect(() => {
        fetchData();

        // Refresh when quiz completion awards points
        const onPointsUpdated = () => fetchData(true);
        window.addEventListener('points-updated', onPointsUpdated);

        // Refresh when user returns to this tab
        const onVisibility = () => { if (document.visibilityState === 'visible') fetchData(true); };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener('points-updated', onPointsUpdated);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [lbRes, myRes] = await Promise.all([
                api.get('/gamification/leaderboard'),
                api.get('/gamification/my-stats'),
            ]);
            setLeaderboard(lbRes.data.leaderboard || []);
            setStats(myRes.data);
        } catch (err) {
            console.error('Leaderboard fetch error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    // Sort leaderboard by filter
    const sorted = [...leaderboard].sort((a, b) => {
        if (filter === 'streak') return (b.streak || 0) - (a.streak || 0);
        if (filter === 'badges') return (b.badges || 0) - (a.badges || 0);
        return (b.points || 0) - (a.points || 0);
    }).map((u, i) => ({ ...u, rank: i + 1 }));

    // Top 3 for podium
    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);
    const currentUserEntry = sorted.find(u => u.isCurrentUser);
    const currentUserRank = currentUserEntry?.rank;

    const cardStyle = { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '16px' };

    return (
        <div style={{ minHeight: '100%', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans',sans-serif", transition: 'background .3s' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 ${accent.from}40} 50%{box-shadow:0 0 0 8px ${accent.from}00} }
                @keyframes spin { to { transform:rotate(360deg); } }
                .lb-row { transition: background .15s, transform .15s; }
                .lb-row:hover { background: ${accent.from}10 !important; transform: translateX(4px); }
                .lb-filter-btn { transition: all .2s; }
                .lb-filter-btn:hover { border-color: ${accent.from} !important; color: ${accent.from} !important; }
            `}</style>

            {/* ── Header ── */}
            <div style={{ padding: '1.75rem 2rem 0', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${accent.from}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trophy size={22} style={{ color: accent.from }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: theme.textPrimary, lineHeight: 1 }}>Leaderboard</h1>
                                <button onClick={() => fetchData(true)} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: '4px', borderRadius: '6px' }}>
                                    <RefreshCw size={15} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none', color: refreshing ? accent.from : theme.textMuted }} />
                                </button>
                            </div>
                            <p style={{ fontSize: '13px', color: theme.textMuted, marginTop: '3px' }}>{leaderboard.length} learners competing</p>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div style={{ display: 'flex', gap: '6px', background: theme.surface, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                        {[['all', '🏆 Points'], ['streak', '🔥 Streak'], ['badges', '🛡️ Badges']].map(([key, label]) => (
                            <button key={key} onClick={() => setFilter(key)} className="lb-filter-btn" style={{
                                padding: '6px 14px', borderRadius: '7px', border: 'none',
                                background: filter === key ? aGrad : 'none',
                                color: filter === key ? '#fff' : theme.textSecondary,
                                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                boxShadow: filter === key ? `0 2px 12px ${accent.glow}` : 'none'
                            }}>{label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem' }}>
                    <div style={{ width: '40px', height: '40px', border: `3px solid ${accent.from}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                </div>
            ) : (
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 2rem', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

                    {/* ── Left: Podium + List ── */}
                    <div>
                        {/* Podium — top 3 */}
                        {top3.length >= 3 && (
                            <div style={{ ...cardStyle, padding: '2rem', marginBottom: '1.5rem', background: `linear-gradient(135deg, ${accent.from}12, ${theme.surface})`, position: 'relative', overflow: 'hidden' }}>
                                {/* decorative bg */}
                                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: `${accent.from}08`, pointerEvents: 'none' }} />

                                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
                                    {/* 2nd place */}
                                    <PodiumCard user={top3[1]} rank={2} theme={theme} accent={accent} height={120} />
                                    {/* 1st place — tallest */}
                                    <PodiumCard user={top3[0]} rank={1} theme={theme} accent={accent} height={160} highlight />
                                    {/* 3rd place */}
                                    <PodiumCard user={top3[2]} rank={3} theme={theme} accent={accent} height={100} />
                                </div>
                            </div>
                        )}

                        {/* Full list */}
                        <div style={cardStyle}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
                                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '15px', fontWeight: 700, color: theme.textPrimary }}>
                                    {filter === 'all' ? 'All Rankings by Points' : filter === 'streak' ? 'Rankings by Streak' : 'Rankings by Badges'}
                                </h2>
                            </div>

                            {sorted.length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: theme.textMuted }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏁</div>
                                    <p>No active learners yet. Be the first!</p>
                                </div>
                            ) : (
                                <div>
                                    {sorted.map((user, idx) => (
                                        <LeaderRow
                                            key={user.rank}
                                            user={user}
                                            filter={filter}
                                            theme={theme}
                                            accent={accent}
                                            animDelay={idx * 40}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Your Stats + How to earn ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '80px' }}>

                        {/* Your Stats card */}
                        {stats && (
                            <div style={{
                                borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden',
                                background: `linear-gradient(145deg, ${accent.from}30, ${accent.to}18, ${theme.surface})`,
                                border: `1px solid ${accent.from}40`,
                                boxShadow: `0 8px 32px ${accent.glow}`
                            }}>
                                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: `${accent.from}15`, pointerEvents: 'none' }} />

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
                                    <div>
                                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '16px', fontWeight: 700, color: theme.textPrimary }}>Your Stats</div>
                                        {currentUserRank && (
                                            <div style={{ fontSize: '12px', color: accent.from, fontWeight: 600, marginTop: '2px' }}>
                                                Rank #{currentUserRank} of {leaderboard.length}
                                            </div>
                                        )}
                                    </div>
                                    <Star size={20} style={{ color: '#fbbf24' }} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', position: 'relative', zIndex: 1 }}>
                                    {[
                                        ['Points', stats.points, '#fbbf24'],
                                        ['Level', stats.level, '#60a5fa'],
                                        ['Streak', `${stats.streak}d`, '#f97316'],
                                        ['Badges', stats.badges?.length || 0, '#a78bfa'],
                                    ].map(([label, value, color]) => (
                                        <div key={label} style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)', padding: '14px', borderRadius: '12px', textAlign: 'center', border: `1px solid rgba(255,255,255,0.08)` }}>
                                            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>{label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* XP progress bar to next level */}
                                <div style={{ marginTop: '1rem', position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                                        <span>Progress to Level {(stats.level || 1) + 1}</span>
                                        <span>{stats.points % 500} / 500 XP</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${((stats.points % 500) / 500) * 100}%`, background: aGrad, borderRadius: '4px', transition: 'width .8s ease' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* How to earn points */}
                        <div style={cardStyle}>
                            <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${theme.border}` }}>
                                <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>How to earn points</h3>
                            </div>
                            <div style={{ padding: '12px' }}>
                                {[
                                    [Zap, 'Pass a quiz (≥70%)', 50, accent.from],
                                    [Crown, 'Complete a course', 200, '#fbbf24'],
                                    [Target, 'Quiz attempt', 10, '#34d399'],
                                    [BookOpen, 'Complete a resource', 10, '#a78bfa'],
                                    [Flame, 'Study time (per 5 min)', 1, '#f97316'],
                                ].map(([Icon, text, pts, color]) => (
                                    <div key={text} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px', borderRadius: '10px', transition: 'background .15s', cursor: 'default' }}
                                        onMouseEnter={e => e.currentTarget.style.background = `${color}10`}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon size={14} style={{ color }} />
                                            </div>
                                            <span style={{ fontSize: '13px', color: theme.textSecondary }}>{text}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color }}>{`+${pts}`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Badges showcase */}
                        {stats?.badges?.length > 0 && (
                            <div style={cardStyle}>
                                <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${theme.border}` }}>
                                    <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', fontWeight: 700, color: theme.textPrimary }}>Your Badges</h3>
                                </div>
                                <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {stats.badges.map((badge, i) => (
                                        <div key={i} title={badge.name || badge} style={{ background: `${accent.from}18`, border: `1px solid ${accent.from}35`, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: accent.from, fontWeight: 600 }}>
                                            🏅 {badge.name || badge}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Podium Card ─────────────────────────────────────────────────────────────
const PodiumCard = ({ user, rank, theme, accent, height, highlight }) => {
    const cfg = RANK_CONFIG[rank] || {};
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: highlight ? '0 0 160px' : '0 0 130px', animation: `fadeUp .4s ease ${rank * 0.1}s both` }}>
            {/* Crown / medal emoji */}
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{cfg.crown}</div>

            {/* Avatar */}
            <div style={{ width: highlight ? '64px' : '52px', height: highlight ? '64px' : '52px', borderRadius: '50%', background: cfg.bg || `linear-gradient(135deg,${accent.from},${accent.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: highlight ? '22px' : '18px', fontWeight: 800, color: '#fff', marginBottom: '8px', boxShadow: `0 4px 20px ${cfg.shadow || accent.glow}`, border: highlight ? `3px solid rgba(255,255,255,0.3)` : '2px solid rgba(255,255,255,0.15)', animation: highlight ? 'pulse 2s infinite' : 'none' }}>
                {user.name ? user.name[0].toUpperCase() : '?'}
            </div>

            {/* Name */}
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: highlight ? '14px' : '12px', color: theme.textPrimary, textAlign: 'center', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}{user.isCurrentUser ? ' 👤' : ''}
            </div>

            {/* Points */}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>{user.points} pts</div>

            {/* Podium block */}
            <div style={{ width: '100%', height: `${height}px`, marginTop: '12px', background: cfg.bg || theme.surface, borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12px', boxShadow: `0 -4px 20px ${cfg.shadow || 'transparent'}` }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{cfg.label}</span>
            </div>
        </div>
    );
};

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
const LeaderRow = ({ user, filter, theme, accent, animDelay }) => {
    const isTop3 = user.rank <= 3;
    const rankColors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#f97316' };
    const rankColor = rankColors[user.rank] || theme.textMuted;

    return (
        <div className="lb-row" style={{
            display: 'flex', alignItems: 'center', padding: '14px 20px',
            borderBottom: `1px solid ${theme.border}`,
            background: user.isCurrentUser ? `${accent.from}10` : 'transparent',
            borderLeft: user.isCurrentUser ? `3px solid ${accent.from}` : '3px solid transparent',
            animation: `fadeUp .3s ease ${animDelay}ms both`,
        }}>
            {/* Rank */}
            <div style={{ width: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isTop3 ? (
                    <span style={{ fontSize: '1.2rem' }}>{['👑', '🥈', '🥉'][user.rank - 1]}</span>
                ) : (
                    <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: rankColor }}>#{user.rank}</span>
                )}
            </div>

            {/* Avatar */}
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: user.isCurrentUser ? `linear-gradient(135deg,${accent.from},${accent.to})` : theme.surface2 || theme.bg, border: `2px solid ${user.isCurrentUser ? accent.from : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: user.isCurrentUser ? '#fff' : theme.textSecondary, marginLeft: '8px', flexShrink: 0 }}>
                {user.name ? user.name[0].toUpperCase() : '?'}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: user.isCurrentUser ? accent.from : theme.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {user.name}
                    {user.isCurrentUser && <span style={{ background: `${accent.from}20`, color: accent.from, border: `1px solid ${accent.from}40`, borderRadius: '20px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>YOU</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: theme.textMuted }}>
                        <Flame size={11} style={{ color: '#f97316' }} /> {user.streak || 0}d streak
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: theme.textMuted }}>
                        <Shield size={11} style={{ color: '#60a5fa' }} /> {user.badges || 0} badges
                    </span>
                    {user.level && (
                        <span style={{ fontSize: '11px', color: theme.textMuted }}>Lv.{user.level}</span>
                    )}
                </div>
            </div>

            {/* Score — changes by filter */}
            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: isTop3 ? rankColors[user.rank] : theme.textPrimary }}>
                    {filter === 'streak' ? `${user.streak || 0}` : filter === 'badges' ? `${user.badges || 0}` : `${user.points || 0}`}
                </div>
                <div style={{ fontSize: '10px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {filter === 'streak' ? 'days' : filter === 'badges' ? 'badges' : 'pts'}
                </div>
            </div>
        </div>
    );
};

const RANK_CONFIG = {
    1: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.4)', label: '1st', crown: '👑' },
    2: { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', shadow: 'rgba(148,163,184,0.3)', label: '2nd', crown: '🥈' },
    3: { bg: 'linear-gradient(135deg,#f97316,#ea580c)', shadow: 'rgba(249,115,22,0.3)', label: '3rd', crown: '🥉' },
};

export default Leaderboard;