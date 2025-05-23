import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme as useMUITheme } from '@mui/material/styles';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(defaultDark);
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        setIsDarkMode(event.matches);
      });
    }
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const theme = useMUITheme();

  useEffect(() => {
    document.documentElement.style.setProperty('--mui-palette-primary-main', theme.palette.primary.main);
    document.documentElement.style.setProperty('--mui-palette-secondary-main', theme.palette.secondary.main);
  }, [theme]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}