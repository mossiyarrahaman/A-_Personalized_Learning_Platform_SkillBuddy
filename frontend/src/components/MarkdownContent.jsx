import React from 'react';

// Callout emoji → { border color, background tint }
// 💡 uses accent.from (passed as prop); others are fixed.
const CALLOUTS = {
    '💡': { color: null,      bg: 'rgba(168,85,247,0.08)' },
    '🔧': { color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
    '⚠️': { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
    '🎯': { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
    '🧠': { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
};

const DEFAULT_THEME = {
    textPrimary:   '#f1f5f9',
    textSecondary: '#94a3b8',
    surface2:      '#1e293b',
    border:        '#334155',
};
const DEFAULT_ACCENT = { from: '#a855f7' };

// Split text on **bold** and `inline code`, returning an array of strings + React nodes.
function inlineFmt(text, theme, keyPrefix) {
    if (typeof text !== 'string') return text;
    const parts = [];
    const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
    let last = 0, m, idx = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        const tok = m[0];
        if (tok.startsWith('**')) {
            parts.push(
                <strong key={`${keyPrefix}-s${idx++}`} style={{ color: theme.textPrimary, fontWeight: 700 }}>
                    {tok.slice(2, -2)}
                </strong>
            );
        } else {
            parts.push(
                <code key={`${keyPrefix}-c${idx++}`} style={{ background: theme.surface2, padding: '2px 6px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace' }}>
                    {tok.slice(1, -1)}
                </code>
            );
        }
        last = m.index + tok.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length > 0 ? parts : text;
}

export default function MarkdownContent({ content, theme, accent }) {
    if (!content) return null;

    const th = { ...DEFAULT_THEME, ...theme };
    const ac = accent || DEFAULT_ACCENT;

    const lines = content.replace(/\\n/g, '\n').split('\n');
    const elements = [];
    let key = 0;
    let paraLines = [];

    function flushPara() {
        if (paraLines.length === 0) return;
        elements.push(
            <p key={key++} style={{ color: th.textSecondary, lineHeight: 1.7, margin: '12px 0' }}>
                {inlineFmt(paraLines.join(' '), th, key)}
            </p>
        );
        paraLines = [];
    }

    let i = 0;
    while (i < lines.length) {
        const t = lines[i].trim();

        // ── Fenced code block ──────────────────────────────────────────────
        if (t.startsWith('```')) {
            flushPara();
            const lang = t.slice(3).trim();
            const codeLines = [];
            i++;
            // Collect until closing fence or EOF (unclosed fence closes at EOF)
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // skip closing ```
            elements.push(
                <pre key={key++} style={{ background: th.surface2, border: `1px solid ${th.border}`, borderRadius: 8, padding: '14px 16px', margin: '16px 0', overflowX: 'auto' }}>
                    <code
                        className={lang ? `lang-${lang}` : undefined}
                        style={{ color: '#86efac', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, display: 'block' }}
                    >
                        {codeLines.join('\n')}
                    </code>
                </pre>
            );
            continue;
        }

        // ── h2 ────────────────────────────────────────────────────────────
        if (/^## /.test(t)) {
            flushPara();
            elements.push(
                <h2 key={key++} style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 22, color: th.textPrimary, marginTop: 28, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${th.border}` }}>
                    {inlineFmt(t.slice(3), th, key)}
                </h2>
            );
            i++; continue;
        }

        // ── h3 ────────────────────────────────────────────────────────────
        if (/^### /.test(t)) {
            flushPara();
            elements.push(
                <h3 key={key++} style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 17, color: th.textPrimary, marginTop: 20, marginBottom: 6 }}>
                    {inlineFmt(t.slice(4), th, key)}
                </h3>
            );
            i++; continue;
        }

        // ── Blockquote (with callout detection) ───────────────────────────
        if (t.startsWith('> ')) {
            flushPara();
            const qLines = [];
            while (i < lines.length && lines[i].trim().startsWith('> ')) {
                qLines.push(lines[i].trim().slice(2));
                i++;
            }
            const firstLine = qLines[0] || '';
            let borderColor = '#6b7280';
            let bgColor = 'rgba(107,114,128,0.08)';
            for (const [emoji, cfg] of Object.entries(CALLOUTS)) {
                if (firstLine.startsWith(emoji)) {
                    borderColor = cfg.color || ac.from;
                    bgColor = cfg.bg;
                    break;
                }
            }
            elements.push(
                <blockquote key={key++} style={{ borderLeft: `4px solid ${borderColor}`, background: bgColor, padding: '12px 16px', margin: '16px 0', borderRadius: '0 8px 8px 0' }}>
                    {qLines.map((ql, qi) => (
                        <p key={qi} style={{ color: th.textSecondary, lineHeight: 1.6, margin: qi === 0 ? 0 : '4px 0 0 0' }}>
                            {inlineFmt(ql, th, `bq${key}-${qi}`)}
                        </p>
                    ))}
                </blockquote>
            );
            continue;
        }

        // ── Unordered list (-, •, *) ──────────────────────────────────────
        if (/^[-•*] /.test(t)) {
            flushPara();
            const items = [];
            while (i < lines.length && /^[-•*] /.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^[-•*] /, ''));
                i++;
            }
            elements.push(
                <ul key={key++} style={{ paddingLeft: 24, margin: '12px 0' }}>
                    {items.map((it, ii) => (
                        <li key={ii} style={{ color: th.textSecondary, lineHeight: 1.7, margin: '6px 0' }}>
                            {inlineFmt(it, th, `ul${key}-${ii}`)}
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        // ── Ordered list ──────────────────────────────────────────────────
        if (/^\d+\. /.test(t)) {
            flushPara();
            const items = [];
            while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^\d+\. /, ''));
                i++;
            }
            elements.push(
                <ol key={key++} style={{ paddingLeft: 24, margin: '12px 0' }}>
                    {items.map((it, ii) => (
                        <li key={ii} style={{ color: th.textSecondary, lineHeight: 1.7, margin: '6px 0' }}>
                            {inlineFmt(it, th, `ol${key}-${ii}`)}
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        // ── Blank line → flush paragraph ──────────────────────────────────
        if (t === '') {
            flushPara();
            i++; continue;
        }

        // ── Paragraph line — accumulate ───────────────────────────────────
        paraLines.push(t);
        i++;
    }

    flushPara(); // flush any trailing paragraph

    return <>{elements}</>;
}
