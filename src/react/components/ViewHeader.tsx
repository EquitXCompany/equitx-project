import { useTheme } from "../../contexts/ThemeContext";
import { Grid2 as Grid, Switch } from "@mui/material";
import Connect from "./connect";
import { type UIMatch, useMatches, useParams } from "react-router-dom";

type MatchWithTitle = UIMatch<
  unknown,
  { title: (params: ReturnType<typeof useParams>) => string }
>;
const hasTitle = (m: UIMatch): m is MatchWithTitle =>
  typeof (m as MatchWithTitle).handle?.title === "function";

export default function ViewHeader() {
  const matches = useMatches();
  const params = useParams();
  const titles = matches
    .filter(hasTitle)
    .map((match) => match.handle.title(params));
  const title = titles[0] ?? "EQUITX";
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Grid container spacing={3} alignItems="center">
      <Grid size="grow">
        <h1 className="page-heading">{title}</h1>
      </Grid>

      <Grid size="auto">
        <Connect />
      </Grid>

      <Grid size="auto">
        <Switch
          className="theme-switch"
          checked={isDarkMode}
          onChange={toggleTheme}
          color="default"
          aria-label="Toggle Dark Mode"
        />
      </Grid>
    </Grid>
  );
}
