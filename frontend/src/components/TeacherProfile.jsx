import { useState, useEffect } from 'react';
import {
    BookOpen, Users, MessageCircle, Calendar,
    Save, Globe, MapPin, Building2, BadgeCheck, User2,
} from 'lucide-react';
import api from '../api/axios';
import { useAppTheme } from '../hooks/useAppTheme';

const AVATAR_GRADIENTS = [
    ['#6366f1', '#8b5cf6'],
    ['#3b82f6', '#06b6d4'],
    ['#f43f5e', '#fb923c'],
    ['#10b981', '#06b6d4'],
    ['#f59e0b', '#ef4444'],
    ['#8b5cf6', '#ec4899'],
    ['#14b8a6', '#6366f1'],
    ['#f97316', '#fbbf24'],
];

/* ── tiny controlled input ── */
const CInput = ({ label, icon: Icon, value, onChange, placeholder, accent, theme, span, required, type = 'text' }) => {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
            <label style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', fontWeight: 700, color: theme.textMuted,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
            }}>
                {Icon && <Icon size={11} />}
                {label}
                {required && <span style={{ color: accent.from, marginLeft: '1px' }}>*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    width: '100%', background: theme.bg,
                    border: `1.5px solid ${focused ? accent.from : theme.border}`,
                    borderRadius: '10px', padding: '10px 14px', color: theme.textPrimary,
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', transition: 'border-color .15s',
                }}
            />
        </div>
    );
};

const TeacherProfile = () => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const [form, setForm] = useState({
        name: '', title: '', bio: '', institution: '', location: '', website: '',
        avatarGradIdx: 0,
    });
    const [stats, setStats] = useState({ totalCourses: 0, totalStudents: 0, doubtsAnswered: 0, memberSince: null });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get('/auth/me'), api.get('/auth/teacher-stats')])
            .then(([meRes, statsRes]) => {
                const u = meRes.data.user;
                setForm({
                    name: u.name || '', title: u.title || '', bio: u.bio || '',
                    institution: u.institution || '', location: u.location || '',
                    website: u.website || '', avatarGradIdx: u.avatarGradIdx ?? 0,
                });
                setStats(statsRes.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!form.name.trim()) { setMsg({ type: 'error', text: 'Name is required.' }); return; }
        setSaving(true); setMsg(null);
        try {
            await api.put('/auth/profile', form);
            setMsg({ type: 'success', text: 'Profile saved successfully.' });
            setTimeout(() => setMsg(null), 3000);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save.' });
        } finally { setSaving(false); }
    };

    const [from, to] = AVATAR_GRADIENTS[form.avatarGradIdx] || AVATAR_GRADIENTS[0];
    const initials = form.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
    const memberSince = stats.memberSince
        ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '—';

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px', color: theme.textMuted, fontSize: '14px' }}>
            Loading profile…
        </div>
    );

    const statItems = [
        { icon: BookOpen, label: 'Total Courses', value: stats.totalCourses, color: '#3b82f6' },
        { icon: Users, label: 'Total Students', value: stats.totalStudents, color: accent.from },
        { icon: MessageCircle, label: 'Doubts Answered', value: stats.doubtsAnswered, color: '#10b981' },
        { icon: Calendar, label: 'Member Since', value: memberSince, color: '#f59e0b' },
    ];

    return (
        /* Stretch to fill whatever height the content area gives us */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', minHeight: '100%' }}>

            {/* ── HERO BANNER ── */}
            <div style={{
                width: '100%', height: '140px',
                background: aGrad, position: 'relative', overflow: 'hidden', flexShrink: 0,
            }}>
                {/* subtle grid texture */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }} />
                {/* large faded initials watermark */}
                <div style={{
                    position: 'absolute', right: '40px', bottom: '-10px',
                    fontSize: '100px', fontWeight: 900, color: 'rgba(255,255,255,0.06)',
                    fontFamily: "'Sora', sans-serif", lineHeight: 1, userSelect: 'none',
                    letterSpacing: '-4px',
                }}>
                    {initials}
                </div>
            </div>

            {/* ── BODY (two columns) ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
                gap: '24px',
                background: theme.bg,
                padding: '0 28px 28px',
                flex: 1,
            }}>

                {/* ────── LEFT PANEL ────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '0' }}>

                    {/* Identity card */}
                    <div style={{
                        background: theme.surface, border: `1px solid ${theme.border}`,
                        borderRadius: '16px', padding: '24px 20px', textAlign: 'center',
                        marginTop: '-48px', position: 'relative',
                    }}>
                        {/* Avatar */}
                        <div style={{
                            width: '88px', height: '88px', borderRadius: '50%',
                            background: `linear-gradient(135deg,${from},${to})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '30px', fontWeight: 800, color: '#fff',
                            margin: '0 auto 14px',
                            fontFamily: "'Sora', sans-serif",
                            border: `4px solid ${theme.surface}`,
                            boxShadow: `0 6px 24px ${from}55`,
                        }}>
                            {initials}
                        </div>

                        <div style={{ fontSize: '17px', fontWeight: 800, color: theme.textPrimary, fontFamily: "'Sora', sans-serif", lineHeight: 1.25 }}>
                            {form.name || 'Your Name'}
                        </div>

                        {form.title ? (
                            <div style={{ fontSize: '12px', color: accent.from, fontWeight: 600, marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <BadgeCheck size={13} /> {form.title}
                            </div>
                        ) : (
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '5px' }}>No title set</div>
                        )}

                        {/* Meta details */}
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            {[
                                { icon: Building2, val: form.institution, placeholder: 'Institution' },
                                { icon: MapPin, val: form.location, placeholder: 'Location' },
                                { icon: Globe, val: form.website, placeholder: 'Website' },
                            ].map(({ icon: Icon, val, placeholder }) => (
                                <div key={placeholder} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: val ? theme.textPrimary : theme.textMuted }}>
                                    <Icon size={13} color={val ? accent.from : theme.textMuted} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {val || placeholder}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: theme.border, margin: '18px 0' }} />

                        {/* Avatar color picker */}
                        <div>
                            <p style={{
                                fontSize: '10px', fontWeight: 700, color: theme.textMuted,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                marginBottom: '12px', textAlign: 'left',
                            }}>Avatar Color</p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {AVATAR_GRADIENTS.map(([g1, g2], idx) => (
                                    <button key={idx}
                                        onClick={() => setForm(f => ({ ...f, avatarGradIdx: idx }))}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: `linear-gradient(135deg,${g1},${g2})`,
                                            border: form.avatarGradIdx === idx ? `3px solid ${theme.textPrimary}` : '3px solid transparent',
                                            outline: form.avatarGradIdx === idx ? `2px solid ${theme.bg}` : 'none',
                                            outlineOffset: '-5px',
                                            cursor: 'pointer', padding: 0, transition: 'all .15s',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {statItems.map(({ icon: Icon, label, value, color }) => (
                            <div key={label} style={{
                                background: theme.surface, border: `1px solid ${theme.border}`,
                                borderRadius: '14px', padding: '16px 14px',
                                display: 'flex', flexDirection: 'column', gap: '8px',
                            }}>
                                <div style={{
                                    width: '34px', height: '34px', borderRadius: '10px',
                                    background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Icon size={16} color={color} />
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: theme.textPrimary, lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>
                                    {value}
                                </div>
                                <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ────── RIGHT PANEL ────── */}
                <div style={{ paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Section header */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: theme.textPrimary, margin: '0 0 4px', fontFamily: "'Sora', sans-serif" }}>
                            Edit Profile
                        </h3>
                        <p style={{ fontSize: '13px', color: theme.textMuted, margin: 0 }}>
                            Update your public information visible to students.
                        </p>
                    </div>

                    {/* Form card */}
                    <div style={{
                        background: theme.surface, border: `1px solid ${theme.border}`,
                        borderRadius: '16px', padding: '24px 24px',
                        display: 'flex', flexDirection: 'column', gap: '20px', flex: 1,
                    }}>
                        {/* Row 1 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <CInput label="Full Name" required icon={User2}
                                value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}
                                placeholder="Your full name" accent={accent} theme={theme} />
                            <CInput label="Title / Role" icon={BadgeCheck}
                                value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))}
                                placeholder="e.g. Senior Instructor" accent={accent} theme={theme} />
                        </div>

                        {/* Row 2 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <CInput label="Institution" icon={Building2}
                                value={form.institution} onChange={v => setForm(f => ({ ...f, institution: v }))}
                                placeholder="University / Company" accent={accent} theme={theme} />
                            <CInput label="Location" icon={MapPin}
                                value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))}
                                placeholder="City, Country" accent={accent} theme={theme} />
                        </div>

                        {/* Row 3 — full width */}
                        <CInput label="Website / Portfolio" icon={Globe} span
                            value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))}
                            placeholder="https://yourwebsite.com" accent={accent} theme={theme} />

                        {/* Bio */}
                        <BioField value={form.bio} onChange={v => setForm(f => ({ ...f, bio: v }))} accent={accent} theme={theme} />

                        {/* Divider */}
                        <div style={{ height: '1px', background: theme.border }} />

                        {/* Save row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    background: saving ? theme.border : aGrad,
                                    border: 'none', color: '#fff', padding: '11px 26px',
                                    borderRadius: '10px', fontWeight: 700, fontSize: '14px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    boxShadow: saving ? 'none' : `0 4px 16px ${accent.from}40`,
                                    fontFamily: 'inherit', transition: 'all .2s', whiteSpace: 'nowrap',
                                }}
                            >
                                <Save size={15} />
                                {saving ? 'Saving…' : 'Save Profile'}
                            </button>

                            {msg && (
                                <span style={{
                                    fontSize: '13px', fontWeight: 600,
                                    color: msg.type === 'success' ? '#4ade80' : '#f87171',
                                }}>
                                    {msg.type === 'success' ? '✓' : '✕'} {msg.text}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* Bio textarea as standalone to keep ControlledInput clean */
const BioField = ({ value, onChange, accent, theme }) => {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700, color: theme.textMuted,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
            }}>Bio</label>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={5}
                placeholder="Tell students a bit about yourself and your teaching style…"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    width: '100%', background: theme.bg,
                    border: `1.5px solid ${focused ? accent.from : theme.border}`,
                    borderRadius: '10px', padding: '10px 14px', color: theme.textPrimary,
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.65,
                    transition: 'border-color .15s',
                }}
            />
        </div>
    );
};

export default TeacherProfile;
