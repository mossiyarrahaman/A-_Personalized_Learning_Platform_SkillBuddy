import { useState, useCallback, useEffect } from 'react';

const THEMES = {
    dark: {
        bg: '#0d0b1a', surface: '#151225', surface2: '#1a1630',
        border: 'rgba(255,255,255,0.09)', borderHover: 'rgba(255,255,255,0.18)',
        textPrimary: '#f0eeff', textSecondary: '#9b97b8', textMuted: '#5a5670',
        headerBg: 'rgba(13,11,26,0.92)', sidebarBg: '#100e20',
    },
    light: {
        bg: '#f5f4ff', surface: '#ffffff', surface2: '#eeedfb',
        border: 'rgba(0,0,0,0.1)', borderHover: 'rgba(0,0,0,0.2)',
        textPrimary: '#0d0c1f', textSecondary: '#4a4670', textMuted: '#9590b8',
        headerBg: 'rgba(245,244,255,0.92)', sidebarBg: '#ededfc',
    },
    midnight: {
        bg: '#000814', surface: '#00101f', surface2: '#001528',
        border: 'rgba(0,180,255,0.12)', borderHover: 'rgba(0,180,255,0.25)',
        textPrimary: '#caf0f8', textSecondary: '#5fa8c4', textMuted: '#2a5c70',
        headerBg: 'rgba(0,8,20,0.92)', sidebarBg: '#000d1a',
    },
    forest: {
        bg: '#050f0a', surface: '#071510', surface2: '#0a1c13',
        border: 'rgba(16,185,129,0.12)', borderHover: 'rgba(16,185,129,0.25)',
        textPrimary: '#d1fae5', textSecondary: '#6ee7b7', textMuted: '#2a6e55',
        headerBg: 'rgba(5,15,10,0.92)', sidebarBg: '#040d08',
    },
    aurora: {
        bg: '#0f0520', surface: '#160830', surface2: '#1c0c3a',
        border: 'rgba(251,113,133,0.12)', borderHover: 'rgba(251,113,133,0.25)',
        textPrimary: '#fce7f3', textSecondary: '#f9a8d4', textMuted: '#7c2d5e',
        headerBg: 'rgba(15,5,32,0.92)', sidebarBg: '#0a0318',
    },
};

const ACCENTS = {
    violet: { from: '#7c3aed', to: '#4f46e5', glow: 'rgba(124,58,237,0.35)' },
    blue: { from: '#2563eb', to: '#0284c7', glow: 'rgba(37,99,235,0.35)' },
    teal: { from: '#0d9488', to: '#059669', glow: 'rgba(13,148,136,0.35)' },
    rose: { from: '#e11d48', to: '#db2777', glow: 'rgba(225,29,72,0.35)' },
    amber: { from: '#d97706', to: '#ea580c', glow: 'rgba(217,119,6,0.35)' },
    lime: { from: '#65a30d', to: '#16a34a', glow: 'rgba(101,163,13,0.35)' },
};

export const useAppTheme = () => {
    const [themeName, setThemeName] = useState(() => {
        try { return localStorage.getItem('sb-theme') || 'dark'; } catch { return 'dark'; }
    });
    const [accentName, setAccentName] = useState(() => {
        try { return localStorage.getItem('sb-accent') || 'violet'; } catch { return 'violet'; }
    });

    // Sync immediately when localStorage changes (same tab via dispatchEvent OR cross-tab)
    useEffect(() => {
        const sync = () => {
            try {
                const t = localStorage.getItem('sb-theme') || 'dark';
                const a = localStorage.getItem('sb-accent') || 'violet';
                setThemeName(t);
                setAccentName(a);
            } catch { }
        };
        // Both cross-tab 'storage' events AND same-tab dispatchEvent('storage') will trigger this
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);

    return {
        theme: THEMES[themeName] || THEMES.dark,
        accent: ACCENTS[accentName] || ACCENTS.violet,
        themeName,
        accentName,
    };
};