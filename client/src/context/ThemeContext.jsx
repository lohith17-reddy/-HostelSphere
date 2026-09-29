import { createContext, useContext, useEffect, useState } from 'react';
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark(!dark) }}>{children}</ThemeCtx.Provider>;
}
