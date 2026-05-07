import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const THEMES = {
  default: { name: 'Default', bg: 'bg-white', sidebar: 'bg-white', text: 'text-gray-900', accent: '#3b82f6', border: 'border-gray-100', navBg: 'bg-white', mutedText: 'text-gray-500', cardBg: 'bg-white' },
  greyscale: { name: 'Greyscale', bg: 'bg-gray-50', sidebar: 'bg-gray-900', text: 'text-gray-900', accent: '#6b7280', border: 'border-gray-200', navBg: 'bg-gray-100', mutedText: 'text-gray-600', cardBg: 'bg-white' },
  dark: { name: 'Dark', bg: 'bg-gray-950', sidebar: 'bg-gray-900', text: 'text-gray-100', accent: '#60a5fa', border: 'border-gray-800', navBg: 'bg-gray-900', mutedText: 'text-gray-400', cardBg: 'bg-gray-900' },
  navy: { name: 'Navy', bg: 'bg-slate-50', sidebar: 'bg-slate-900', text: 'text-slate-900', accent: '#0ea5e9', border: 'border-slate-200', navBg: 'bg-slate-100', mutedText: 'text-slate-500', cardBg: 'bg-white' },
  emerald: { name: 'Emerald', bg: 'bg-emerald-50/30', sidebar: 'bg-emerald-950', text: 'text-gray-900', accent: '#059669', border: 'border-emerald-100', navBg: 'bg-emerald-50', mutedText: 'text-gray-500', cardBg: 'bg-white' },
};

const THEME_KEY = 'orbit_theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'default');

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    const t = THEMES[theme] || THEMES.default;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--accent-color', t.accent);
    // Apply body classes
    document.body.className = theme === 'dark' ? 'bg-gray-950' : theme === 'greyscale' ? 'bg-gray-50' : theme === 'navy' ? 'bg-slate-50' : theme === 'emerald' ? 'bg-emerald-50/30' : 'bg-white';
  }, [theme]);

  return { theme, setTheme, config: THEMES[theme] || THEMES.default };
}

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Theme">
        <Palette size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-40">
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => { setTheme(key); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${theme === key ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <div className="w-3 h-3 rounded-full border" style={{ background: t.accent }} />
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
