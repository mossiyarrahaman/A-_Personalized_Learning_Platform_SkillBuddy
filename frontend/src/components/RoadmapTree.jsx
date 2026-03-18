import React, { useState } from 'react';
import {
    Check, Lock, ChevronDown, ChevronUp, BookOpen,
    ArrowRight, Circle, CheckCircle2, Star, ListTree,
    Target, TrendingUp, Code2, Lightbulb, FileText, Zap, Brain
} from 'lucide-react';
import { useAppTheme } from '../hooks/useAppTheme';
import QuizModal from './QuizModal';

// ─── Full curriculum database ────────────────────────────────────────────────
const CURRICULUM = {
    // ── HTML ──────────────────────────────────────────────────────────────────
    'html introduction': [{ t: 'What is HTML?', type: 'concept' }, { t: 'History of HTML', type: 'concept' }, { t: 'HTML vs XHTML', type: 'concept' }],
    'html editors': [{ t: 'VS Code setup', type: 'tool' }, { t: 'Live Server extension', type: 'tool' }, { t: 'Browser DevTools intro', type: 'tool' }],
    'html basic': [{ t: 'DOCTYPE declaration', type: 'concept' }, { t: 'HTML document structure', type: 'concept' }, { t: 'Viewing page source', type: 'practice' }],
    'html elements': [{ t: 'Opening & closing tags', type: 'concept' }, { t: 'Nested elements', type: 'concept' }, { t: 'Empty elements', type: 'concept' }, { t: 'Element attributes overview', type: 'concept' }],
    'html attributes': [{ t: 'Global attributes', type: 'concept' }, { t: 'id attribute', type: 'practice' }, { t: 'class attribute', type: 'practice' }, { t: 'style attribute', type: 'practice' }, { t: 'title attribute', type: 'practice' }],
    'html headings': [{ t: 'h1 through h6', type: 'practice' }, { t: 'Headings & SEO', type: 'concept' }, { t: 'Heading hierarchy best practices', type: 'concept' }],
    'html paragraphs': [{ t: '<p> tag usage', type: 'practice' }, { t: 'White space & line breaks', type: 'concept' }, { t: '<br> and <hr> tags', type: 'practice' }],
    'html styles': [{ t: 'Inline styles', type: 'practice' }, { t: 'Internal <style> block', type: 'practice' }, { t: 'External stylesheet link', type: 'practice' }, { t: 'CSS property syntax', type: 'concept' }],
    'html formatting': [{ t: '<b> and <strong>', type: 'practice' }, { t: '<i> and <em>', type: 'practice' }, { t: '<mark>, <small>, <del>', type: 'practice' }, { t: '<sub> and <sup>', type: 'practice' }, { t: '<pre> for preformatted text', type: 'practice' }],
    'html quotations': [{ t: '<blockquote>', type: 'practice' }, { t: '<q> inline quote', type: 'practice' }, { t: '<abbr> abbreviation', type: 'practice' }, { t: '<cite> & <address>', type: 'practice' }],
    'html comments': [{ t: '<!-- --> syntax', type: 'practice' }, { t: 'Commenting out code', type: 'practice' }, { t: 'Comment best practices', type: 'concept' }],
    'html colors': [{ t: 'Named colors', type: 'concept' }, { t: 'HEX color codes', type: 'practice' }, { t: 'RGB & RGBA', type: 'practice' }, { t: 'HSL & HSLA', type: 'practice' }],
    'html css': [{ t: 'Linking external CSS', type: 'practice' }, { t: 'Selectors: element, class, id', type: 'practice' }, { t: 'Box model intro', type: 'concept' }, { t: 'Text & font properties', type: 'practice' }],
    'html links': [{ t: '<a href> tag', type: 'practice' }, { t: 'Absolute vs relative URLs', type: 'concept' }, { t: 'target="_blank"', type: 'practice' }, { t: 'Linking to page sections (#id)', type: 'practice' }, { t: 'Email & tel links', type: 'practice' }],
    'html images': [{ t: '<img src> & alt text', type: 'practice' }, { t: 'Width & height attributes', type: 'practice' }, { t: 'Image formats: jpg, png, svg, webp', type: 'concept' }, { t: 'Image as link', type: 'practice' }, { t: '<figure> & <figcaption>', type: 'practice' }],
    'html favicon': [{ t: 'Adding a favicon', type: 'practice' }, { t: 'Favicon formats', type: 'concept' }, { t: 'Apple touch icons', type: 'concept' }],
    'html page title': [{ t: '<title> tag', type: 'practice' }, { t: 'Tab title vs h1', type: 'concept' }, { t: 'Dynamic titles with JS', type: 'concept' }],
    'html tables': [{ t: '<table>, <tr>, <td>, <th>', type: 'practice' }, { t: '<thead>, <tbody>, <tfoot>', type: 'practice' }, { t: 'colspan & rowspan', type: 'practice' }, { t: 'Table styling with CSS', type: 'practice' }, { t: 'Accessible tables & scope', type: 'concept' }],
    'html lists': [{ t: 'Unordered list <ul>', type: 'practice' }, { t: 'Ordered list <ol>', type: 'practice' }, { t: 'Description list <dl>', type: 'practice' }, { t: 'Nested lists', type: 'practice' }, { t: 'List styling with CSS', type: 'practice' }],
    'html block & inline': [{ t: 'Block-level elements', type: 'concept' }, { t: 'Inline elements', type: 'concept' }, { t: '<div> as block container', type: 'practice' }, { t: '<span> as inline container', type: 'practice' }],
    'html div': [{ t: '<div> for layout', type: 'practice' }, { t: 'Nesting divs', type: 'practice' }, { t: 'div vs semantic elements', type: 'concept' }],
    'html classes': [{ t: 'class attribute syntax', type: 'practice' }, { t: 'Multiple classes on one element', type: 'practice' }, { t: 'Targeting classes in CSS', type: 'practice' }],
    'html id': [{ t: 'id attribute syntax', type: 'practice' }, { t: 'id uniqueness rule', type: 'concept' }, { t: 'Linking to ids with #', type: 'practice' }],
    'html buttons': [{ t: '<button> element', type: 'practice' }, { t: 'Button types: submit, reset, button', type: 'practice' }, { t: 'Styling buttons', type: 'practice' }, { t: 'Disabled state', type: 'practice' }],
    'html iframes': [{ t: '<iframe> embed syntax', type: 'practice' }, { t: 'src, width, height attributes', type: 'practice' }, { t: 'Embedding YouTube', type: 'practice' }, { t: 'Sandbox attribute', type: 'concept' }],
    'html javascript': [{ t: '<script> tag placement', type: 'practice' }, { t: 'defer & async attributes', type: 'concept' }, { t: 'External script files', type: 'practice' }, { t: 'Inline event handlers (avoid)', type: 'concept' }],
    'html file paths': [{ t: 'Absolute paths', type: 'concept' }, { t: 'Relative paths', type: 'concept' }, { t: 'Root-relative paths', type: 'concept' }, { t: '.. to go up a directory', type: 'practice' }],
    'html head': [{ t: '<meta charset>', type: 'practice' }, { t: '<meta viewport>', type: 'practice' }, { t: '<meta description>', type: 'practice' }, { t: '<link> for CSS', type: 'practice' }, { t: '<script> in head vs body', type: 'concept' }],
    'html layout': [{ t: '<header>, <nav>, <main>', type: 'practice' }, { t: '<article> & <section>', type: 'practice' }, { t: '<aside> & <footer>', type: 'practice' }, { t: 'CSS flexbox for layout', type: 'practice' }, { t: 'CSS grid for layout', type: 'practice' }],
    'html responsive': [{ t: 'Viewport meta tag', type: 'practice' }, { t: 'Media queries in CSS', type: 'practice' }, { t: 'Responsive images with srcset', type: 'practice' }, { t: 'Mobile-first approach', type: 'concept' }, { t: 'CSS clamp() & fluid type', type: 'practice' }],
    'html semantics': [{ t: 'Why semantics matter', type: 'concept' }, { t: 'Semantic vs non-semantic elements', type: 'concept' }, { t: 'ARIA roles intro', type: 'concept' }, { t: 'Screen reader behavior', type: 'concept' }],
    // Forms
    'html forms': [{ t: '<form> element & attributes', type: 'practice' }, { t: 'action & method (GET/POST)', type: 'concept' }, { t: '<input> types overview', type: 'practice' }, { t: '<label> & for attribute', type: 'practice' }, { t: 'Required & validation attributes', type: 'practice' }, { t: '<fieldset> & <legend>', type: 'practice' }],
    'html form attributes': [{ t: 'action, method, enctype', type: 'concept' }, { t: 'novalidate & autocomplete', type: 'practice' }, { t: 'target attribute on forms', type: 'practice' }],
    'html form elements': [{ t: '<select> dropdown', type: 'practice' }, { t: '<textarea>', type: 'practice' }, { t: '<datalist>', type: 'practice' }, { t: '<output>', type: 'practice' }, { t: '<option> & <optgroup>', type: 'practice' }],
    'html input types': [{ t: 'text, email, password', type: 'practice' }, { t: 'number, range, date', type: 'practice' }, { t: 'checkbox, radio', type: 'practice' }, { t: 'file, color', type: 'practice' }, { t: 'search, tel, url', type: 'practice' }, { t: 'hidden input', type: 'practice' }],
    'html input attributes': [{ t: 'placeholder', type: 'practice' }, { t: 'value & name', type: 'practice' }, { t: 'min, max, step', type: 'practice' }, { t: 'pattern (regex)', type: 'practice' }, { t: 'readonly & disabled', type: 'practice' }],
    // Graphics
    'html canvas': [{ t: '<canvas> element setup', type: 'practice' }, { t: '2D context (getContext)', type: 'practice' }, { t: 'Drawing rectangles & paths', type: 'practice' }, { t: 'Canvas text & images', type: 'practice' }, { t: 'Animation with requestAnimationFrame', type: 'practice' }],
    'html svg': [{ t: 'SVG vs Canvas', type: 'concept' }, { t: 'Basic SVG shapes', type: 'practice' }, { t: 'SVG paths', type: 'practice' }, { t: 'SVG viewBox & scaling', type: 'practice' }, { t: 'Inline SVG in HTML', type: 'practice' }],
    // Media
    'html media': [{ t: 'Media element overview', type: 'concept' }, { t: 'MIME types', type: 'concept' }],
    'html video': [{ t: '<video> element', type: 'practice' }, { t: 'controls, autoplay, loop', type: 'practice' }, { t: 'Multiple sources & formats', type: 'practice' }, { t: 'Video captions with <track>', type: 'practice' }],
    'html audio': [{ t: '<audio> element', type: 'practice' }, { t: 'controls & autoplay', type: 'practice' }, { t: 'Audio formats: mp3, ogg, wav', type: 'concept' }],
    'html youtube': [{ t: 'Embedding YouTube iframe', type: 'practice' }, { t: 'YouTube URL parameters', type: 'practice' }, { t: 'Privacy-enhanced mode', type: 'concept' }],
    // APIs
    'html web apis': [{ t: 'Web Storage: localStorage', type: 'practice' }, { t: 'sessionStorage', type: 'practice' }, { t: 'Fetch API intro', type: 'practice' }, { t: 'History API', type: 'concept' }],
    'html geolocation': [{ t: 'navigator.geolocation', type: 'practice' }, { t: 'getCurrentPosition()', type: 'practice' }, { t: 'Handling errors', type: 'practice' }],
    'html drag and drop': [{ t: 'draggable attribute', type: 'practice' }, { t: 'dragstart / dragover / drop events', type: 'practice' }, { t: 'DataTransfer object', type: 'practice' }],
    'html web workers': [{ t: 'What are Web Workers?', type: 'concept' }, { t: 'Creating a worker', type: 'practice' }, { t: 'postMessage & onmessage', type: 'practice' }],
    'html sse': [{ t: 'Server-Sent Events concept', type: 'concept' }, { t: 'EventSource API', type: 'practice' }, { t: 'SSE vs WebSockets', type: 'concept' }],
    // Examples/Study
    'html examples': [{ t: 'Build a personal webpage', type: 'project' }, { t: 'Create a table layout', type: 'project' }, { t: 'Build a contact form', type: 'project' }],
    'html quiz': [{ t: 'HTML basics quiz', type: 'quiz' }, { t: 'Semantics quiz', type: 'quiz' }, { t: 'Forms & inputs quiz', type: 'quiz' }],
    'html accessibility': [{ t: 'alt text best practices', type: 'concept' }, { t: 'Keyboard navigation', type: 'concept' }, { t: 'ARIA labels & roles', type: 'practice' }, { t: 'Color contrast', type: 'concept' }, { t: 'Focus management', type: 'practice' }],

    // ── CSS ───────────────────────────────────────────────────────────────────
    'css introduction': [{ t: 'What is CSS?', type: 'concept' }, { t: 'CSS syntax: selector { property: value }', type: 'concept' }, { t: 'Browser default styles', type: 'concept' }],
    'css selectors': [{ t: 'Element selector', type: 'practice' }, { t: 'Class selector (.class)', type: 'practice' }, { t: 'ID selector (#id)', type: 'practice' }, { t: 'Attribute selector [attr]', type: 'practice' }, { t: 'Pseudo-classes :hover, :focus', type: 'practice' }, { t: 'Pseudo-elements ::before, ::after', type: 'practice' }, { t: 'Combinators: descendant, child, sibling', type: 'practice' }],
    'css box model': [{ t: 'Content, padding, border, margin', type: 'concept' }, { t: 'box-sizing: border-box', type: 'practice' }, { t: 'width & height', type: 'practice' }, { t: 'min/max width & height', type: 'practice' }, { t: 'overflow property', type: 'practice' }],
    'css flexbox': [{ t: 'display: flex', type: 'practice' }, { t: 'flex-direction & flex-wrap', type: 'practice' }, { t: 'justify-content', type: 'practice' }, { t: 'align-items & align-content', type: 'practice' }, { t: 'flex-grow, flex-shrink, flex-basis', type: 'practice' }, { t: 'order & align-self', type: 'practice' }, { t: 'Gap property', type: 'practice' }],
    'css grid': [{ t: 'display: grid', type: 'practice' }, { t: 'grid-template-columns & rows', type: 'practice' }, { t: 'grid-gap / gap', type: 'practice' }, { t: 'grid-column & grid-row span', type: 'practice' }, { t: 'grid-template-areas', type: 'practice' }, { t: 'auto-fit & minmax()', type: 'practice' }, { t: 'Implicit vs explicit grid', type: 'concept' }],
    'css positioning': [{ t: 'static (default)', type: 'concept' }, { t: 'relative positioning', type: 'practice' }, { t: 'absolute positioning', type: 'practice' }, { t: 'fixed positioning', type: 'practice' }, { t: 'sticky positioning', type: 'practice' }, { t: 'z-index & stacking context', type: 'practice' }],
    'css animations': [{ t: '@keyframes rule', type: 'practice' }, { t: 'animation-name & duration', type: 'practice' }, { t: 'animation-timing-function', type: 'practice' }, { t: 'animation-delay & iteration', type: 'practice' }, { t: 'CSS transitions', type: 'practice' }, { t: 'transform: translate, rotate, scale', type: 'practice' }],
    'css variables': [{ t: 'Declaring --custom-properties', type: 'practice' }, { t: 'var() function', type: 'practice' }, { t: ':root scope', type: 'practice' }, { t: 'Dark mode with variables', type: 'practice' }],

    // ── JavaScript ────────────────────────────────────────────────────────────
    'javascript introduction': [{ t: 'What is JavaScript?', type: 'concept' }, { t: 'Browser vs Node.js', type: 'concept' }, { t: 'Adding JS to HTML', type: 'practice' }, { t: 'console.log() basics', type: 'practice' }],
    'variables & data types': [{ t: 'var, let, const', type: 'concept' }, { t: 'String, Number, Boolean', type: 'concept' }, { t: 'null & undefined', type: 'concept' }, { t: 'typeof operator', type: 'practice' }, { t: 'Type coercion', type: 'concept' }],
    'operators': [{ t: 'Arithmetic operators', type: 'practice' }, { t: 'Comparison: ==, ===, !==', type: 'practice' }, { t: 'Logical: &&, ||, !', type: 'practice' }, { t: 'Nullish coalescing ??', type: 'practice' }, { t: 'Optional chaining ?.', type: 'practice' }],
    'control flow': [{ t: 'if / else if / else', type: 'practice' }, { t: 'Ternary operator', type: 'practice' }, { t: 'switch statement', type: 'practice' }, { t: 'for loop', type: 'practice' }, { t: 'while & do...while', type: 'practice' }, { t: 'break & continue', type: 'practice' }],
    'functions': [{ t: 'Function declaration', type: 'practice' }, { t: 'Function expression', type: 'practice' }, { t: 'Arrow functions', type: 'practice' }, { t: 'Default parameters', type: 'practice' }, { t: 'Rest parameters & spread', type: 'practice' }, { t: 'Closures', type: 'concept' }, { t: 'Higher-order functions', type: 'concept' }],
    'arrays': [{ t: 'Creating & indexing arrays', type: 'practice' }, { t: 'push, pop, shift, unshift', type: 'practice' }, { t: 'slice & splice', type: 'practice' }, { t: 'map, filter, reduce', type: 'practice' }, { t: 'find, findIndex, some, every', type: 'practice' }, { t: 'flat & flatMap', type: 'practice' }, { t: 'Array destructuring', type: 'practice' }],
    'objects': [{ t: 'Object literals', type: 'practice' }, { t: 'Dot & bracket notation', type: 'practice' }, { t: 'Object destructuring', type: 'practice' }, { t: 'Spread in objects', type: 'practice' }, { t: 'Object.keys/values/entries', type: 'practice' }, { t: 'Prototype chain', type: 'concept' }, { t: 'ES6 Classes', type: 'practice' }],
    'dom manipulation': [{ t: 'document.querySelector', type: 'practice' }, { t: 'innerHTML & textContent', type: 'practice' }, { t: 'classList: add, remove, toggle', type: 'practice' }, { t: 'createElement & appendChild', type: 'practice' }, { t: 'addEventListener', type: 'practice' }, { t: 'Event object & preventDefault', type: 'practice' }, { t: 'Event delegation', type: 'concept' }],
    'async javascript': [{ t: 'Callbacks', type: 'concept' }, { t: 'Promises: resolve/reject', type: 'practice' }, { t: '.then() & .catch()', type: 'practice' }, { t: 'async / await', type: 'practice' }, { t: 'try / catch / finally', type: 'practice' }, { t: 'Fetch API', type: 'practice' }, { t: 'Promise.all / Promise.race', type: 'practice' }],

    // ── React ─────────────────────────────────────────────────────────────────
    'react introduction': [{ t: 'What is React?', type: 'concept' }, { t: 'Virtual DOM', type: 'concept' }, { t: 'Create React App vs Vite', type: 'tool' }, { t: 'Project structure', type: 'concept' }],
    'jsx': [{ t: 'JSX syntax rules', type: 'concept' }, { t: 'Embedding expressions {}', type: 'practice' }, { t: 'JSX vs HTML differences', type: 'concept' }, { t: 'Fragments <>', type: 'practice' }],
    'components': [{ t: 'Functional components', type: 'practice' }, { t: 'Component naming conventions', type: 'concept' }, { t: 'Importing & exporting', type: 'practice' }, { t: 'Component composition', type: 'practice' }],
    'props': [{ t: 'Passing props', type: 'practice' }, { t: 'Destructuring props', type: 'practice' }, { t: 'Default props', type: 'practice' }, { t: 'children prop', type: 'practice' }, { t: 'PropTypes', type: 'practice' }],
    'state & hooks': [{ t: 'useState basics', type: 'practice' }, { t: 'State update & re-render', type: 'concept' }, { t: 'useEffect: side effects', type: 'practice' }, { t: 'useEffect cleanup', type: 'practice' }, { t: 'useRef', type: 'practice' }, { t: 'useContext', type: 'practice' }, { t: 'Custom hooks', type: 'practice' }],
    'react router': [{ t: 'BrowserRouter setup', type: 'practice' }, { t: '<Route> & <Routes>', type: 'practice' }, { t: 'useNavigate hook', type: 'practice' }, { t: 'useParams hook', type: 'practice' }, { t: 'Nested routes', type: 'practice' }, { t: 'Protected routes', type: 'practice' }],

    // ── Python ────────────────────────────────────────────────────────────────
    'python introduction': [{ t: 'Python overview', type: 'concept' }, { t: 'Installing Python', type: 'tool' }, { t: 'Running scripts', type: 'practice' }, { t: 'Python REPL', type: 'tool' }],
    'python syntax': [{ t: 'Indentation rules', type: 'concept' }, { t: 'Comments: # and """', type: 'practice' }, { t: 'print() function', type: 'practice' }, { t: 'input() function', type: 'practice' }],
    'python data types': [{ t: 'int, float, complex', type: 'concept' }, { t: 'str methods', type: 'practice' }, { t: 'bool & None', type: 'concept' }, { t: 'Type conversion', type: 'practice' }],
    'python collections': [{ t: 'Lists & indexing', type: 'practice' }, { t: 'Tuples (immutable)', type: 'concept' }, { t: 'Sets & frozensets', type: 'practice' }, { t: 'Dictionaries', type: 'practice' }, { t: 'List comprehensions', type: 'practice' }],
    'python functions': [{ t: 'def keyword', type: 'practice' }, { t: 'Parameters & arguments', type: 'practice' }, { t: '*args & **kwargs', type: 'practice' }, { t: 'Lambda functions', type: 'practice' }, { t: 'Decorators', type: 'concept' }],
    'python oop': [{ t: 'Classes & __init__', type: 'practice' }, { t: 'Instance vs class variables', type: 'concept' }, { t: 'Inheritance', type: 'practice' }, { t: 'Dunder methods', type: 'practice' }, { t: '@property decorator', type: 'practice' }],
};

// ─── Smart subtopic lookup ────────────────────────────────────────────────────
const DEFAULT_SUBTOPICS = [
    { t: 'Core concepts overview', type: 'concept' },
    { t: 'Fundamental principles', type: 'concept' },
    { t: 'Hands-on practice exercise', type: 'practice' },
    { t: 'Common patterns & use cases', type: 'practice' },
    { t: 'Best practices & pitfalls', type: 'concept' },
    { t: 'Mini project / challenge', type: 'project' },
];

const getSubtopics = (topicTitle = '') => {
    const key = topicTitle.toLowerCase().trim();
    // Exact match
    if (CURRICULUM[key]) return CURRICULUM[key];
    // Partial match — find best key that the topic title contains
    const match = Object.keys(CURRICULUM).find(k => key.includes(k) || k.includes(key.split(' ').slice(0, 3).join(' ')));
    if (match) return CURRICULUM[match];
    // Keyword match
    const keywords = ['html', 'css', 'javascript', 'react', 'python', 'node', 'typescript'];
    for (const kw of keywords) {
        if (key.includes(kw)) {
            const subMatch = Object.keys(CURRICULUM).find(k => k.startsWith(kw) && key.includes(k.replace(kw + ' ', '')));
            if (subMatch) return CURRICULUM[subMatch];
        }
    }
    return DEFAULT_SUBTOPICS;
};

// ─── Type icon & color ────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    concept: { icon: Lightbulb, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Concept' },
    practice: { icon: Code2, color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Practice' },
    project: { icon: Zap, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'Project' },
    quiz: { icon: FileText, color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Quiz' },
    tool: { icon: Code2, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Tool' },
};

const getModuleStyle = (status, accent) => {
    switch (status) {
        case 'completed': return { dot: '#22c55e', glow: 'rgba(34,197,94,0.3)', barColor: '#22c55e', borderAlpha: '50' };
        case 'unlocked': return { dot: accent.from, glow: accent.glow, barColor: accent.from, borderAlpha: '50' };
        default: return { dot: '#374151', glow: 'none', barColor: '#374151', borderAlpha: '15' };
    }
};

// ─── Subtopic Pill ────────────────────────────────────────────────────────────
const SubtopicPill = ({ sub, theme, accent, done, onToggle }) => {
    const cfg = TYPE_CONFIG[sub.type] || TYPE_CONFIG.concept;
    const Icon = cfg.icon;
    return (
        <div onClick={onToggle} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
            background: done ? `${cfg.color}18` : theme.surface,
            border: `1px solid ${done ? cfg.color + '40' : theme.border}`,
            transition: 'all .15s', userSelect: 'none'
        }}
            onMouseEnter={e => { if (!done) e.currentTarget.style.borderColor = cfg.color + '50'; }}
            onMouseLeave={e => { if (!done) e.currentTarget.style.borderColor = theme.border; }}
        >
            {done
                ? <CheckCircle2 size={11} style={{ color: cfg.color, flexShrink: 0 }} />
                : <Icon size={11} style={{ color: cfg.color, flexShrink: 0 }} />
            }
            <span style={{
                fontSize: '11px', fontWeight: 500,
                color: done ? theme.textMuted : theme.textSecondary,
                textDecoration: done ? 'line-through' : 'none',
                whiteSpace: 'nowrap'
            }}>{sub.t}</span>
            <span style={{ fontSize: '9px', background: cfg.bg, color: cfg.color, borderRadius: '4px', padding: '1px 5px', fontWeight: 600, flexShrink: 0 }}>
                {cfg.label}
            </span>
        </div>
    );
};

// ─── Topic Row ────────────────────────────────────────────────────────────────
const TopicRow = ({ topic, moduleId, onTopicClick, onTopicToggle, theme, accent }) => {
    const [showSubs, setShowSubs] = useState(false);
    const [doneSet, setDoneSet] = useState(new Set());
    const [quizOpen, setQuizOpen] = useState(false);

    const isLocked = topic.status === 'locked';
    const isDone = topic.status === 'completed';

    // Get subtopics from curriculum DB
    const subtopics = getSubtopics(topic.title);
    const doneSubs = doneSet.size;

    const toggleSub = (i) => {
        setDoneSet(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    return (
        <>
            <div style={{
                borderRadius: '12px', border: `1px solid ${isDone ? '#22c55e30' : theme.border}`,
                background: isDone ? 'rgba(34,197,94,0.04)' : theme.surface,
                marginBottom: '8px', overflow: 'hidden',
                opacity: isLocked ? 0.4 : 1, transition: 'all .2s'
            }}>
                {/* Topic header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                    {/* Status icon */}
                    <div style={{ flexShrink: 0 }}>
                        {isDone
                            ? <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                            : isLocked
                                ? <Lock size={14} style={{ color: theme.textMuted }} />
                                : <Circle size={16} style={{ color: theme.textMuted }} />
                        }
                    </div>

                    {/* Title */}
                    <div onClick={() => !isLocked && onTopicClick?.(moduleId, topic.id)}
                        style={{ flex: 1, minWidth: 0, cursor: isLocked ? 'default' : 'pointer' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: isDone ? theme.textMuted : theme.textPrimary, textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {topic.title}
                        </div>
                        {topic.description && (
                            <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {topic.description}
                            </div>
                        )}
                    </div>

                    {/* Subtopics expand */}
                    {!isLocked && (
                        <button onClick={() => setShowSubs(p => !p)} style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px',
                            borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none',
                            color: theme.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                            transition: 'all .15s', flexShrink: 0
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                        >
                            <ListTree size={11} />
                            {doneSubs}/{subtopics.length}
                            {showSubs ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                    )}

                    {/* Mark done */}
                    {!isLocked && (
                        <button onClick={e => { e.stopPropagation(); onTopicToggle?.(moduleId, topic.id, isDone ? 'pending' : 'completed'); }} style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            border: `2px solid ${isDone ? '#22c55e' : theme.border}`,
                            background: isDone ? '#22c55e' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0, transition: 'all .2s'
                        }}
                            onMouseEnter={e => { if (!isDone) e.currentTarget.style.borderColor = '#22c55e'; }}
                            onMouseLeave={e => { if (!isDone) e.currentTarget.style.borderColor = theme.border; }}
                        >
                            <Check size={11} style={{ color: isDone ? '#000' : 'transparent' }} strokeWidth={3} />
                        </button>
                    )}

                    {!isLocked && (
                        <button onClick={e => { e.stopPropagation(); setQuizOpen(true); }} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.color = accent.from; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                            title="Take quiz on this topic"
                        >
                            <Brain size={11} /> Quiz
                        </button>
                    )}
                    {!isLocked && (
                        <ArrowRight size={13} style={{ color: theme.textMuted, cursor: 'pointer', flexShrink: 0 }}
                            onClick={() => onTopicClick?.(moduleId, topic.id)} />
                    )}
                </div>

                {/* Subtopics panel */}
                {showSubs && !isLocked && (
                    <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                            📚 Subtopics — click to mark done
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {subtopics.map((sub, i) => (
                                <SubtopicPill
                                    key={i} sub={sub} theme={theme} accent={accent}
                                    done={doneSet.has(i)} onToggle={() => toggleSub(i)}
                                />
                            ))}
                        </div>
                        {/* Subtopic progress bar */}
                        {subtopics.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: theme.textMuted, marginBottom: '4px' }}>
                                    <span>{doneSubs} of {subtopics.length} subtopics done</span>
                                    <span>{Math.round((doneSubs / subtopics.length) * 100)}%</span>
                                </div>
                                <div style={{ height: '4px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(doneSubs / subtopics.length) * 100}%`, background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`, borderRadius: '3px', transition: 'width .4s' }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quiz Modal */}
            {quizOpen && (
                <QuizModal
                    isOpen={quizOpen}
                    onClose={() => setQuizOpen(false)}
                    topicTitle={topic.title}
                    topicId={topic.id || topic._id}
                    moduleId={moduleId}
                />
            )}
        </>
    );
};

// ─── Module Card ──────────────────────────────────────────────────────────────
const ModuleCard = ({ module, index, isLeft, onTopicClick, onTopicToggle, theme, accent }) => {
    const [expanded, setExpanded] = useState(module.status === 'unlocked' || index === 0);
    const ms = getModuleStyle(module.status, accent);
    const totalT = module.topics?.length || 0;
    const doneT = module.topics?.filter(t => t.status === 'completed').length || 0;
    const pct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;

    return (
        <div style={{ position: 'relative', marginBottom: '4rem', display: 'flex', width: '100%', justifyContent: isLeft ? 'flex-start' : 'flex-end' }}>
            {/* Spine dot */}
            <div style={{ position: 'absolute', left: '50%', top: '1.5rem', transform: 'translateX(-50%)', zIndex: 10 }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${ms.dot}`, background: theme.bg, boxShadow: ms.glow !== 'none' ? `0 0 10px ${ms.glow}` : 'none', transition: 'all .3s' }} />
            </div>

            {/* Connector line */}
            <div style={{ position: 'absolute', top: '1.85rem', height: '1px', background: ms.dot, opacity: 0.25, width: 'calc(50% - 24px)', left: isLeft ? '50%' : 'auto', right: isLeft ? 'auto' : '50%' }} />

            {/* Card */}
            <div style={{ width: 'calc(50% - 48px)', borderRadius: '18px', border: `1px solid ${ms.dot + ms.borderAlpha}`, background: theme.surface, overflow: 'hidden', boxShadow: `0 4px 24px rgba(0,0,0,0.2)`, transition: 'all .3s', opacity: module.status === 'locked' ? 0.5 : 1 }}>
                {/* Accent bar */}
                <div style={{ height: '2px', background: ms.dot, opacity: 0.6 }} />

                <div style={{ padding: '18px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '20px', background: `${ms.dot}18`, color: ms.dot, border: `1px solid ${ms.dot}35` }}>
                                    Week {index + 1}
                                </span>
                                {module.status === 'completed' && (
                                    <span style={{ fontSize: '10px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                        <Star size={9} fill="currentColor" /> Complete
                                    </span>
                                )}
                            </div>
                            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', fontWeight: 700, color: theme.textPrimary, lineHeight: 1.3 }}>{module.title}</h3>
                            {module.description && <p style={{ fontSize: '11px', color: theme.textMuted, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{module.description}</p>}
                        </div>
                        {module.status === 'locked'
                            ? <Lock size={14} style={{ color: theme.textMuted, flexShrink: 0, marginTop: '2px' }} />
                            : <button onClick={() => setExpanded(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: '4px', borderRadius: '6px', flexShrink: 0, display: 'flex' }}>
                                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                        }
                    </div>

                    {/* Progress */}
                    {module.status !== 'locked' && (
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: theme.textMuted, marginBottom: '4px' }}>
                                <span>{doneT}/{totalT} topics</span>
                                <span style={{ fontWeight: 700, color: pct === 100 ? '#22c55e' : theme.textMuted }}>{pct}%</span>
                            </div>
                            <div style={{ height: '4px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : `linear-gradient(90deg,${accent.from},${accent.to})`, borderRadius: '3px', transition: 'width .6s ease' }} />
                            </div>
                        </div>
                    )}

                    {/* Topics */}
                    {module.status !== 'locked' && expanded && (
                        <div>
                            {module.topics?.length > 0
                                ? module.topics.map((topic, ti) => (
                                    <TopicRow
                                        key={topic.id || topic._id || ti}
                                        topic={topic} moduleId={module.id || module._id}
                                        onTopicClick={onTopicClick} onTopicToggle={onTopicToggle}
                                        theme={theme} accent={accent}
                                    />
                                ))
                                : <div style={{ fontSize: '12px', color: theme.textMuted, textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>No topics yet</div>
                            }
                        </div>
                    )}

                    {/* Collapsed hint */}
                    {module.status !== 'locked' && !expanded && totalT > 0 && (
                        <button onClick={() => setExpanded(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'color .15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = accent.from}
                            onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>
                            <BookOpen size={11} /> {totalT} topics <ChevronDown size={11} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main RoadmapTree ─────────────────────────────────────────────────────────
const RoadmapTree = ({ modules = [], onTopicClick, onTopicToggle }) => {
    const { theme, accent } = useAppTheme();
    const aGrad = `linear-gradient(135deg,${accent.from},${accent.to})`;

    const totalTopics = modules.reduce((s, m) => s + (m.topics?.length || 0), 0);
    const completedTopics = modules.reduce((s, m) => s + (m.topics?.filter(t => t.status === 'completed').length || 0), 0);
    const completedMods = modules.filter(m => m.status === 'completed').length;
    const overall = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <div style={{ width: '100%', background: theme.bg, color: theme.textPrimary, fontFamily: "'DM Sans',sans-serif", transition: 'background .3s' }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

            {/* Header */}
            <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: '2.5rem 1rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Rainbow top bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(to right, ${accent.from}, ${accent.to}, #22c55e)` }} />
                {/* Glow */}
                <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '200px', background: `${accent.from}10`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.6rem,4vw,2.5rem)', fontWeight: 800, color: theme.textPrimary, marginBottom: '8px', position: 'relative' }}>
                    Your Learning{' '}
                    <span style={{ background: aGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>Roadmap</span>
                </h1>
                <p style={{ fontSize: '13px', color: theme.textSecondary, maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                    Complete each topic to unlock the next module. Click any subtopic pill to track micro-progress.
                </p>

                {/* Stats pills */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {[
                        { icon: TrendingUp, val: `${overall}%`, label: 'overall', color: accent.from },
                        { icon: Target, val: `${completedTopics}/${totalTopics}`, label: 'topics done', color: '#34d399' },
                        { icon: CheckCircle2, val: `${completedMods}/${modules.length}`, label: 'modules done', color: '#60a5fa' },
                    ].map(({ icon: Icon, val, label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '7px 14px' }}>
                            <Icon size={14} style={{ color }} />
                            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: '13px', fontWeight: 700, color: theme.textPrimary }}>{val}</span>
                            <span style={{ fontSize: '11px', color: theme.textMuted }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Overall progress */}
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <div style={{ height: '6px', background: theme.border, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                        <div style={{ height: '100%', width: `${overall}%`, background: aGrad, borderRadius: '4px', transition: 'width 1s ease' }} />
                    </div>
                </div>
            </div>

            {/* Roadmap canvas */}
            <div style={{ position: 'relative', maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
                {/* Spine */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: theme.border, transform: 'translateX(-50%)', pointerEvents: 'none' }} />

                {modules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: theme.textMuted }}>
                        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
                        <p style={{ fontSize: '15px', fontWeight: 500 }}>No modules yet</p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>Your learning path will appear here once generated.</p>
                    </div>
                ) : (
                    modules.map((module, i) => (
                        <ModuleCard
                            key={module.id || module._id || i}
                            module={module} index={i} isLeft={i % 2 === 0}
                            onTopicClick={onTopicClick} onTopicToggle={onTopicToggle}
                            theme={theme} accent={accent}
                        />
                    ))
                )}

                {/* Goal marker */}
                {modules.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1rem' }}>
                        <div style={{ width: '1px', height: '2rem', background: theme.border }} />
                        <div style={{ padding: '8px 20px', borderRadius: '20px', border: `2px solid ${overall === 100 ? '#22c55e' : theme.border}`, color: overall === 100 ? '#22c55e' : theme.textMuted, background: overall === 100 ? 'rgba(34,197,94,0.08)' : theme.surface, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {overall === 100 ? <><Star size={12} fill="currentColor" /> Goal Reached!</> : <><Target size={12} /> {100 - overall}% remaining</>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoadmapTree;