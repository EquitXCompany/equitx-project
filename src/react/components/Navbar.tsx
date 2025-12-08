import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  type SxProps,
  type Theme,
  Typography,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  WorkOutline as PortfolioIcon,
  AccountBalance as CDPIcon,
  Pool as PoolIcon,
  AdminPanelSettings as AdminIcon,
  Feedback as FeedbackIcon,
} from "@mui/icons-material";
import { useTheme } from "../../contexts/ThemeContext";
import { useWallet } from "../../wallet";
import { ADMIN_ADDRESS } from "../../constants";

export const drawerWidth = 300;
const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScIw31uG19BYszyMnKeDfRo4-UnbKAkHxQWBhpYvtdFEr-F-g/viewform?usp=dialog";

const navHeader = (isDarkMode: boolean): SxProps<Theme> => ({
  fontWeight: 600,
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: isDarkMode
    ? "var(--color-text-secondary-dark)"
    : "var(--color-text-secondary-light)",
  mb: 1,
  mt: 1,
  display: "block",
});

export default function Navbar({
  open,
  toggle,
}: {
  open: boolean;
  toggle: VoidFunction;
}) {
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { isSignedIn, account } = useWallet();

  const contents = (
    <>
      <h1 className="header-brand">EquitX</h1>

      <List disablePadding sx={{ mt: 2 }}>
        <Typography variant="caption" sx={navHeader(isDarkMode)}>
          Menu
        </Typography>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            selected={location.pathname === "/"}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>

        {isSignedIn && account === ADMIN_ADDRESS && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin"
              selected={location.pathname === "/admin"}
            >
              <ListItemIcon>
                <AdminIcon />
              </ListItemIcon>
              <ListItemText primary="Admin" />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/portfolio"
            selected={location.pathname === "/portfolio"}
          >
            <ListItemIcon>
              <PortfolioIcon />
            </ListItemIcon>
            <ListItemText primary="Portfolio" />
          </ListItemButton>
        </ListItem>

        <Typography variant="caption" sx={navHeader(isDarkMode)}>
          xAssets
        </Typography>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/cdps"
            selected={location.pathname.startsWith("/cdps")}
          >
            <ListItemIcon>
              <CDPIcon />
            </ListItemIcon>
            <ListItemText primary="CDPs" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/stability-pools"
            selected={location.pathname === "/stability-pools"}
          >
            <ListItemIcon>
              <PoolIcon />
            </ListItemIcon>
            <ListItemText primary="Stability Pools" />
          </ListItemButton>
        </ListItem>

        <Typography variant="caption" sx={navHeader(isDarkMode)}>
          Help
        </Typography>

        <ListItem disablePadding>
          <ListItemButton
            component="a"
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ListItemIcon>
              <FeedbackIcon />
            </ListItemIcon>
            <ListItemText primary="Contact Us" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  const baseSx = {
    flexShrink: 0,
    transition: "width 0.2s ease",
    "& .MuiDrawer-paper": {
      width: `calc(${drawerWidth}px - (2 * var(--spacing-md)))`,
      boxSizing: "border-box",
      backgroundColor: isDarkMode
        ? "var(--color-surface-darker)"
        : "var(--color-background-light)",
      border: "none",
      padding: "var(--spacing-md)",
      margin: "var(--spacing-md)",
      maxHeight: "calc(100vh - (2 * var(--spacing-md)))",
    },
  };

  return (
    <>
      <Drawer
        data-open="permanent"
        variant="permanent"
        open
        anchor="left"
        sx={{
          ...baseSx,
          display: { sm: "none", md: "block" },
          width: drawerWidth,
        }}
      >
        {contents}
      </Drawer>
      <Drawer
        data-open={open}
        variant="temporary"
        open={open}
        onClose={toggle}
        sx={{
          ...baseSx,
          display: { sm: "block", md: "none" },
          width: open ? drawerWidth : 0,
        }}
      >
        {contents}
      </Drawer>
    </>
  );
}
