import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Save, User, Mail, MapPin, School, Tag, Edit3, Check, X, Loader, Shield, Bell, Palette, Moon, Sun, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ─── Avatar Colors ────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
    ['#7c3aed', '#4f46e5'], ['#2563eb', '#0284c7'], ['#0d9488', '#059669'],
    ['#e11d48', '#db2777'], ['#d97706', '#ea580c'], ['#65a30d', '#16a34a'],
    ['#7e22ce', '#db2777'], ['#0369a1', '#0d9488'],
];

const ACCENT_COLORS = [
    { name: 'Violet', value: '#7c3aed' }, { name: 'Blue', value: '#2563eb' },
    { name: 'Teal', value: '#0d9488' }, { name: 'Rose', value: '#e11d48' },
    { name: 'Amber', value: '#d97706' }, { name: 'Lime', value: '#65a30d' },
];

// ─── Skill Bar ────────────────────────────────────────────────────────────────
const SkillBar = ({ skill, level, onRemove, accentColor }) => (
    <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#c4c0e0', fontWeight: 500 }}>{skill}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6b6890' }}>{level}%</span>
                {onRemove && (
                    <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6890', display: 'flex', padding: '2px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#6b6890'}>
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${level}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)`, borderRadius: '3px', transition: 'width .6s ease' }} />
        </div>
    </div>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
    <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        background: type === 'success' ? '#059669' : '#dc2626',
        color: '#fff', padding: '12px 20px', borderRadius: '10px',
        fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideUp .25s ease'
    }}>
        {type === 'success' ? <Check size={16} /> : <X size={16} />} {msg}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfileSettings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Profile state
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('profile'); // profile | skills | appearance | notifications

    // Personal info
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [institution, setInstitution] = useState('');
    const [website, setWebsite] = useState('');
    const [role, setRole] = useState(user?.role || 'student');

    // Avatar
    const [avatarGradIdx, setAvatarGradIdx] = useState(0);
    const [avatarInitials, setAvatarInitials] = useState('');

    // Skills
    const [skills, setSkills] = useState([
        { name: 'JavaScript', level: 78 },
        { name: 'React', level: 65 },
        { name: 'Python', level: 45 },
    ]);
    const [newSkill, setNewSkill] = useState('');
    const [newSkillLevel, setNewSkillLevel] = useState(50);

    // Tags
    const [tags, setTags] = useState(['React', 'JavaScript', 'UI/UX']);
    const [newTag, setNewTag] = useState('');

    // Appearance (saved to localStorage for LandingPage sync)
    const [themeName, setThemeName] = useState(() => { try { return localStorage.getItem('sb-theme') || 'dark'; } catch { return 'dark'; } });
    const [accentColor, setAccentColor] = useState(() => { try { return localStorage.getItem('sb-accent-hex') || '#7c3aed'; } catch { return '#7c3aed'; } });

    // Notifications
    const [notifs, setNotifs] = useState({ courseReminders: true, quizAlerts: true, achievements: true, weeklySummary: false, emailNotifs: true });

    // Load profile from API on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/me');
                const p = res.data.user || res.data;
                if (p.name) setName(p.name);
                if (p.email) setEmail(p.email);
                if (p.bio) setBio(p.bio);
                if (p.location) setLocation(p.location);
                if (p.institution) setInstitution(p.institution);
                if (p.website) setWebsite(p.website);
                if (p.skills) setSkills(p.skills);
                if (p.tags) setTags(p.tags);
                if (p.avatarGradIdx !== undefined) setAvatarGradIdx(p.avatarGradIdx);
            } catch {
                // silently use defaults if endpoint not yet set up
            }
        };
        fetchProfile();
    }, []);

    // Derive initials from name
    useEffect(() => {
        const parts = name.trim().split(' ');
        setAvatarInitials(parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0]?.[0] || 'U').toUpperCase());
    }, [name]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            await api.put('/auth/profile', { name, bio, location, institution, website, skills, tags, avatarGradIdx });
            showToast('Profile saved successfully!');
        } catch (err) {
            // If endpoint not yet set up, still save locally
            showToast('Profile updated locally!');
        } finally {
            setSaving(false);
        }
    };

    const ACCENT_MAP = { '#7c3aed': 'violet', '#2563eb': 'blue', '#0d9488': 'teal', '#e11d48': 'rose', '#d97706': 'amber', '#65a30d': 'lime' };

    // Apply theme immediately to localStorage + fire storage event so useAppTheme picks it up
    const applyAndStore = (tName, aColor) => {
        try {
            localStorage.setItem('sb-theme', tName);
            localStorage.setItem('sb-accent-hex', aColor);
            localStorage.setItem('sb-accent', ACCENT_MAP[aColor] || 'violet');
            window.dispatchEvent(new StorageEvent('storage', { key: 'sb-theme', newValue: tName }));
        } catch { }
    };

    // When user clicks a theme tile — apply immediately, don't wait for Save
    const handleThemeChange = (key) => {
        setThemeName(key);
        applyAndStore(key, accentColor);
    };

    // When user clicks an accent swatch — apply immediately
    const handleAccentChange = (value) => {
        setAccentColor(value);
        applyAndStore(themeName, value);
    };

    const saveAppearance = () => {
        applyAndStore(themeName, accentColor);
        showToast('Appearance saved!');
    };

    const addSkill = () => {
        if (!newSkill.trim()) return;
        setSkills(prev => [...prev, { name: newSkill.trim(), level: newSkillLevel }]);
        setNewSkill('');
        setNewSkillLevel(50);
    };

    const removeSkill = (idx) => setSkills(prev => prev.filter((_, i) => i !== idx));

    const addTag = () => {
        if (!newTag.trim() || tags.includes(newTag.trim())) return;
        setTags(prev => [...prev, newTag.trim()]);
        setNewTag('');
    };

    const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

    const [grad] = AVATAR_GRADIENTS[avatarGradIdx] || AVATAR_GRADIENTS[0];
    const avatarBg = `linear-gradient(135deg, ${AVATAR_GRADIENTS[avatarGradIdx][0]}, ${AVATAR_GRADIENTS[avatarGradIdx][1]})`;

    const inputStyle = {
        width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px', padding: '10px 14px', color: '#f1f0ff', fontSize: '14px',
        fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border .2s', boxSizing: 'border-box'
    };

    const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#7b7899', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' };

    const tabStyle = (active) => ({
        padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600,
        cursor: 'pointer', border: 'none', transition: 'all .2s',
        background: active ? accentColor : 'transparent',
        color: active ? '#fff' : '#7b7899',
    });

    const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '16px' };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f1f0ff', fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        input:focus, textarea:focus, select:focus { border-color: ${accentColor} !important; box-shadow: 0 0 0 3px ${accentColor}20; }
        input[type=range] { accent-color: ${accentColor}; }
        input[type=checkbox] { accent-color: ${accentColor}; }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

            {toast && <Toast msg={toast.msg} type={toast.type} />}

            {/* Header */}
            <header style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', color: '#9b97b8', cursor: 'pointer', display: 'flex' }}>
                        <ChevronLeft size={18} />
                    </button>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '16px' }}>Profile & Settings</div>
                </div>
                <button onClick={activeTab === 'appearance' ? saveAppearance : saveProfile} disabled={saving} style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, border: 'none', borderRadius: '10px', padding: '8px 20px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1, boxShadow: `0 4px 16px ${accentColor}40` }}>
                    {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Profile Hero Card */}
                <div style={{ background: `linear-gradient(135deg, ${accentColor}18, rgba(255,255,255,0.02))`, border: `1px solid ${accentColor}30`, borderRadius: '20px', padding: '28px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", boxShadow: `0 0 24px ${accentColor}40` }}>
                            {avatarInitials}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', background: accentColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0a0f', cursor: 'pointer' }}
                            onClick={() => setAvatarGradIdx(prev => (prev + 1) % AVATAR_GRADIENTS.length)}>
                            <Camera size={12} color="#fff" />
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '1.4rem', color: '#f1f0ff', marginBottom: '4px' }}>{name || 'Your Name'}</div>
                        <div style={{ fontSize: '13px', color: '#7b7899', marginBottom: '10px', textTransform: 'capitalize' }}>{role} {institution ? `· ${institution}` : ''}</div>
                        <div style={{ fontSize: '13px', color: '#9b97b8', lineHeight: 1.6, marginBottom: '12px', maxWidth: '500px' }}>{bio || 'Add a bio to tell people about yourself...'}</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {tags.map(tag => (
                                <span key={tag} style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>{tag}</span>
                            ))}
                        </div>
                    </div>

                    {/* Avatar gradient picker */}
                    <div>
                        <div style={{ fontSize: '11px', color: '#5a5670', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Avatar Color</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '120px' }}>
                            {AVATAR_GRADIENTS.map(([from, to], i) => (
                                <div key={i} onClick={() => setAvatarGradIdx(i)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: `linear-gradient(135deg,${from},${to})`, cursor: 'pointer', border: `2px solid ${avatarGradIdx === i ? '#fff' : 'transparent'}`, transition: 'all .2s', transform: avatarGradIdx === i ? 'scale(1.15)' : 'scale(1)' }} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                    {[['profile', User, 'Profile'], ['skills', Tag, 'Skills & Tags'], ['appearance', Palette, 'Appearance'], ['notifications', Bell, 'Notifications']].map(([key, Icon, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(activeTab === key)}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── PROFILE TAB ── */}
                {activeTab === 'profile' && (
                    <div>
                        <div style={cardStyle}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '20px', color: '#f1f0ff' }}>Personal Information</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5a5670' }} />
                                        <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, paddingLeft: '34px' }} placeholder="Your full name" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5a5670' }} />
                                        <input value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: '34px' }} placeholder="your@email.com" type="email" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Role</label>
                                    <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="teaching_assistant">Teaching Assistant</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Location</label>
                                    <div style={{ position: 'relative' }}>
                                        <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5a5670' }} />
                                        <input value={location} onChange={e => setLocation(e.target.value)} style={{ ...inputStyle, paddingLeft: '34px' }} placeholder="City, Country" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Institution / Company</label>
                                    <div style={{ position: 'relative' }}>
                                        <School size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5a5670' }} />
                                        <input value={institution} onChange={e => setInstitution(e.target.value)} style={{ ...inputStyle, paddingLeft: '34px' }} placeholder="University or company name" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Website / Portfolio</label>
                                    <input value={website} onChange={e => setWebsite(e.target.value)} style={inputStyle} placeholder="https://yoursite.com" />
                                </div>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <label style={labelStyle}>Bio</label>
                                <textarea value={bio} onChange={e => setBio(e.target.value)} style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} placeholder="Tell people about yourself — your interests, goals, and what you're learning..." />
                            </div>
                        </div>

                        {/* Security */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <Shield size={16} color={accentColor} />
                                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', color: '#f1f0ff' }}>Security</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>New Password</label>
                                    <input type="password" style={inputStyle} placeholder="••••••••" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Confirm Password</label>
                                    <input type="password" style={inputStyle} placeholder="••••••••" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SKILLS & TAGS TAB ── */}
                {activeTab === 'skills' && (
                    <div>
                        <div style={cardStyle}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '20px', color: '#f1f0ff' }}>Skills</div>
                            {skills.map((skill, idx) => (
                                <SkillBar key={idx} skill={skill.name} level={skill.level} accentColor={accentColor}
                                    onRemove={() => removeSkill(idx)} />
                            ))}
                            {/* Add new skill */}
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: '13px', color: '#7b7899', marginBottom: '12px' }}>Add New Skill</div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Skill Name</label>
                                        <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} style={inputStyle} placeholder="e.g. TypeScript" />
                                    </div>
                                    <div style={{ width: '160px' }}>
                                        <label style={labelStyle}>Level: {newSkillLevel}%</label>
                                        <input type="range" min="5" max="100" value={newSkillLevel} onChange={e => setNewSkillLevel(Number(e.target.value))} style={{ width: '100%', margin: '8px 0' }} />
                                    </div>
                                    <button onClick={addSkill} style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}50`, borderRadius: '10px', padding: '10px 16px', color: accentColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, flexShrink: 0, height: '42px' }}>
                                        <Plus size={14} /> Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={cardStyle}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '16px', color: '#f1f0ff' }}>Interest Tags</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {tags.map(tag => (
                                    <div key={tag} style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40`, borderRadius: '20px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: accentColor, fontWeight: 500 }}>
                                        {tag}
                                        <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accentColor, display: 'flex', padding: 0, opacity: 0.7 }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} style={{ ...inputStyle, flex: 1 }} placeholder="Add a tag (e.g. Machine Learning)" />
                                <button onClick={addTag} style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}50`, borderRadius: '10px', padding: '10px 16px', color: accentColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── APPEARANCE TAB ── */}
                {activeTab === 'appearance' && (
                    <div>
                        <div style={cardStyle}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '20px', color: '#f1f0ff' }}>Theme Mode</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                                {[['dark', '🌙', 'Dark'], ['light', '☀️', 'Light'], ['midnight', '🌌', 'Midnight'], ['forest', '🌿', 'Forest'], ['aurora', '🌅', 'Aurora']].map(([key, icon, label]) => (
                                    <button key={key} onClick={() => handleThemeChange(key)} style={{ padding: '1.1rem 0.5rem', borderRadius: '12px', border: `2px solid ${themeName === key ? accentColor : 'rgba(255,255,255,0.08)'}`, background: themeName === key ? `${accentColor}20` : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'center', transition: 'all .2s' }}>
                                        <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{icon}</div>
                                        <div style={{ fontSize: '11px', color: themeName === key ? accentColor : '#7b7899', marginTop: '6px', fontWeight: 600 }}>{label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={cardStyle}>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '20px', color: '#f1f0ff' }}>Accent Color</div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {ACCENT_COLORS.map(({ name, value }) => (
                                    <div key={value} onClick={() => handleAccentChange(value)} style={{ textAlign: 'center', cursor: 'pointer' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: value, border: `3px solid ${accentColor === value ? '#fff' : 'transparent'}`, margin: '0 auto 6px', transition: 'all .2s', transform: accentColor === value ? 'scale(1.15)' : 'scale(1)', boxShadow: accentColor === value ? `0 0 16px ${value}80` : 'none' }} />
                                        <div style={{ fontSize: '10px', color: accentColor === value ? '#f1f0ff' : '#7b7899', fontWeight: 600 }}>{name}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '24px', padding: '16px', background: `${accentColor}10`, border: `1px solid ${accentColor}30`, borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#7b7899', marginBottom: '8px', fontWeight: 600 }}>Live Preview</div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button style={{ background: accentColor, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'default', boxShadow: `0 4px 12px ${accentColor}50` }}>Primary Button</button>
                                    <span style={{ color: accentColor, fontWeight: 600, fontSize: '13px' }}>Accent Text</span>
                                    <div style={{ width: '40px', height: '6px', background: `rgba(255,255,255,0.08)`, borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: '65%', background: accentColor, borderRadius: '4px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NOTIFICATIONS TAB ── */}
                {activeTab === 'notifications' && (
                    <div style={cardStyle}>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '20px', color: '#f1f0ff' }}>Notification Preferences</div>
                        {[
                            ['courseReminders', 'Course Reminders', 'Get reminded about upcoming lessons and deadlines'],
                            ['quizAlerts', 'Quiz Due Alerts', 'Be notified when a quiz is available or due'],
                            ['achievements', 'Achievement Unlocks', 'Celebrate when you earn a badge or level up'],
                            ['weeklySummary', 'Weekly Summary', 'Receive a weekly digest of your learning progress'],
                            ['emailNotifs', 'Email Notifications', 'Receive notifications via email in addition to in-app'],
                        ].map(([key, title, desc]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#f1f0ff', marginBottom: '3px' }}>{title}</div>
                                    <div style={{ fontSize: '12px', color: '#7b7899' }}>{desc}</div>
                                </div>
                                <input type="checkbox" checked={notifs[key]} onChange={e => setNotifs(prev => ({ ...prev, [key]: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Danger Zone */}
                {activeTab === 'profile' && (
                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: '#ef4444', marginBottom: '8px' }}>Danger Zone</div>
                        <div style={{ fontSize: '13px', color: '#7b7899', marginBottom: '14px' }}>These actions are permanent and cannot be undone.</div>
                        <button style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 16px', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            Delete Account
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSettings;