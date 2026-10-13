'use client';

import { useEffect, useState } from 'react';

const themes = [
  { name: 'Officine', class: 'theme-officine' },
  { name: 'Clinique', class: 'theme-clinique' },
  { name: 'Apothicaire', class: 'theme-apothicaire' },
];

const normalizeTheme = (themeClass: string) => {
  if (themeClass === 'theme-agriculture') return 'theme-officine';
  if (themeClass === 'theme-ocean') return 'theme-clinique';
  if (themeClass === 'theme-savane') return 'theme-apothicaire';
  return themeClass;
};

const applyTheme = (themeClass: string) => {
  const normalized = normalizeTheme(themeClass);
  // Remove all previous theme classes
  themes.forEach(t => document.documentElement.classList.remove(t.class));
  document.documentElement.classList.remove('theme-agriculture', 'theme-ocean', 'theme-savane');
  
  // Apply selected theme (unless it's officine which is the default root)
  if (normalized !== 'theme-officine') {
    document.documentElement.classList.add(normalized);
  }
};

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState('theme-officine');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rawTheme = localStorage.getItem('app-theme') || 'theme-officine';
    const savedTheme = normalizeTheme(rawTheme);
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  const changeTheme = (themeClass: string) => {
    const normalized = normalizeTheme(themeClass);
    setCurrentTheme(normalized);
    localStorage.setItem('app-theme', normalized);
    applyTheme(normalized);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {themes.map((theme) => (
        <button
          key={theme.name}
          onClick={() => changeTheme(theme.class)}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md border transition-all ${
            currentTheme === theme.class
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-surface text-foreground-muted border-surface-border hover:text-foreground hover:bg-black/5'
          }`}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}
