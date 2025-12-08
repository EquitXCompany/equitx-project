import { useTheme } from "../../contexts/ThemeContext";
import { Grid2 as Grid, IconButton, Typography, Switch } from "@mui/material";
import Chevron from "./common/Chevron";
import Connect from "./connect";
import { type UIMatch, useMatches, useParams } from "react-router-dom";

type MatchWithTitle = UIMatch<
  unknown,
  { title: (params: ReturnType<typeof useParams>) => string }
>;
const hasTitle = (m: UIMatch): m is MatchWithTitle =>
  typeof (m as MatchWithTitle).handle?.title === "function";

export default function ViewHeader({
  isNavOpen,
  toggleNav,
}: {
  isNavOpen: boolean;
  toggleNav: VoidFunction;
}) {
  const matches = useMatches();
  const params = useParams();
  const titles = matches
    .filter(hasTitle)
    .map((match) => match.handle.title(params));
  const title = titles[0] ?? "EQUITX";
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Grid
      container
      spacing={3}
      alignItems="center"
      sx={{
        marginBottom: 4,
        paddingTop: "var(--spacing-xl)",
      }}
    >
      <Grid size="grow" container>
        <IconButton
          className="nav-toggle"
          onClick={toggleNav}
          type="button"
          sx={{
            display: { sm: "block", md: "none" },
          }}
        >
          <Chevron open={isNavOpen} isDarkMode={isDarkMode} />
        </IconButton>

        <Typography
          variant="h1"
          sx={{
            fontSize: "var(--font-size-3xl)",
            margin: 0,
            textAlign: "left",
          }}
        >
          {title}
        </Typography>
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
