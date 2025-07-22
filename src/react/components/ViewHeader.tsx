import { useTheme } from "../../contexts/ThemeContext";

import { Stack, Switch } from "@mui/material";
import Connect from "./connect";

export default function ViewHeader() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Stack component="header" className="header" direction="row" spacing={2}>
      <h1 className="header-brand">EQUITX</h1>

      <Connect />

      <Switch
        className="theme-switch"
        checked={isDarkMode}
        onChange={toggleTheme}
        color="default"
        aria-label="Toggle Dark Mode"
      />
    </Stack>
  );
}
