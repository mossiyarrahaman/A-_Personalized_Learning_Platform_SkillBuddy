import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, BarChart, BookOpen, Trophy, LogOut, Home, MessageSquare, User } from 'lucide-react';
import { useAppTheme } from '../hooks/Useapptheme';

const Sidebar = ({ onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();
    const { theme, accent } = useAppTheme();

    const aGrad = `linear-gradient(135deg, ${accent.from}, ${accent.to})`;

    const navItems = [
        { icon: Home, label: 'Dashboard', to: '/dashboard', isActive: location.pathname === '/dashboard' },
        { icon: BookOpen, label: 'My Courses', to: '/my-courses', isActive: location.pathname.startsWith('/my-courses') || location.pathname.startsWith('/class/') },
        { icon: MessageSquare, label: 'Doubt Resolution', to: '/doubts', isActive: location.pathname === '/doubts' },
        { icon: BarChart, label: 'Analytics', to: '/analytics', isActive: location.pathname === '/analytics' },
        { icon: Trophy, label: 'Leaderboard', to: '/leaderboard', isActive: location.pathname === '/leaderboard' },
        { icon: User, label: 'Profile', to: '/profile', isActive: location.pathname === '/profile' },
    ];

    return (
        <aside style={{
            width: isCollapsed ? '72px' : '240px',
            background: theme.sidebarBg,
            borderRight: `1px solid ${theme.border}`,
            display: 'none',
            flexDirection: 'column',
            transition: 'width .3s, background .3s',
            height: '100vh', position: 'sticky', top: 0, flexShrink: 0
        }} className="sb-sidebar">

            <style>{`
                @media (min-width: 768px) { .sb-sidebar { display: flex !important; } }
                .sb-nav-item:hover { background: ${accent.from}18 !important; color: ${accent.from} !important; }
                .sb-logout-btn:hover { background: rgba(239,68,68,0.08) !important; color: #f87171 !important; }
                .sb-menu-btn:hover { background: ${theme.surface} !important; color: ${theme.textPrimary} !important; }
            `}</style>

            {/* Logo row */}
            <div style={{ padding: '1.25rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px', flexShrink: 0 }}>
                {!isCollapsed && (
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: '1.2rem', background: aGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
                            SkillBuddy
                        </span>
                    </Link>
                )}
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="sb-menu-btn" style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted,
                    padding: '6px', borderRadius: '8px', display: 'flex', transition: 'all .2s',
                    marginLeft: isCollapsed ? 'auto' : '0', marginRight: isCollapsed ? 'auto' : '0'
                }}>
                    <Menu size={20} />
                </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navItems.map(({ icon: Icon, label, to, isActive }) => (
                    <Link key={to} to={to} title={isCollapsed ? label : ''} className="sb-nav-item" style={{
                        display: 'flex', alignItems: 'center',
                        gap: isCollapsed ? 0 : '0.75rem',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        padding: isCollapsed ? '0.7rem' : '0.7rem 0.9rem',
                        borderRadius: '10px', textDecoration: 'none', fontWeight: 500, fontSize: '13.5px',
                        background: isActive ? `${accent.from}20` : 'none',
                        color: isActive ? accent.from : theme.textSecondary,
                        boxShadow: isActive ? `inset 0 0 0 1px ${accent.from}35` : 'none',
                        transition: 'all .2s'
                    }}>
                        <Icon size={18} style={{ flexShrink: 0 }} />
                        {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '0.75rem', borderTop: `1px solid ${theme.border}` }}>
                <button onClick={onLogout} className="sb-logout-btn" style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: isCollapsed ? 0 : '0.75rem', justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '0.7rem' : '0.7rem 0.9rem',
                    borderRadius: '10px', border: 'none', background: 'none',
                    color: theme.textMuted, cursor: 'pointer', fontSize: '13.5px', fontWeight: 500, transition: 'all .2s'
                }}>
                    <LogOut size={18} style={{ flexShrink: 0 }} />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;