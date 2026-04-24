import React, { createContext, useCallback, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

export interface DarkModeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const applyTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, applyTheme]);

  const contextValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <DarkModeContext.Provider value={contextValue}>{children}</DarkModeContext.Provider>;
}
