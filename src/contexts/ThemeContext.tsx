import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useTheme as useMUITheme } from "@mui/material/styles";

const prefersDark = "(prefers-color-scheme: dark)";
const storageKey = "equitx-theme";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use media query to set initial theme state unless it's already been set by user
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const pref = window.localStorage.getItem(storageKey);
    if (pref) return pref === "dark";
    return window.matchMedia(prefersDark).matches;
  });

  // Add event listener for system preference changes
  useEffect(() => {
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
    };

    window.matchMedia(prefersDark).addEventListener("change", handleChange);

    return () => {
      window
        .matchMedia(prefersDark)
        .removeEventListener("change", handleChange);
    };
  }, []);

  // Toggle body attribute on state change
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light",
    );
  }, [isDarkMode]);

  const theme = useMUITheme();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--mui-palette-primary-main",
      theme.palette.primary.main,
    );
    document.documentElement.style.setProperty(
      "--mui-palette-secondary-main",
      theme.palette.secondary.main,
    );
  }, [theme]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // then update local storage with the same change
    window.localStorage.setItem(storageKey, !isDarkMode ? "dark" : "light");
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
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
