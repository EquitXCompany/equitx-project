import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useTheme as useMUITheme } from "@mui/material/styles";

const prefersDark = "(prefers-color-scheme: dark)";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use media query to set initial theme state
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia(prefersDark).matches,
  );

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

  // Add toggle body attribute on state change
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
