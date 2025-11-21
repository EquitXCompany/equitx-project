import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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

const drawerWidth = 280;
const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScIw31uG19BYszyMnKeDfRo4-UnbKAkHxQWBhpYvtdFEr-F-g/viewform?usp=dialog";

export default function Navbar() {
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { isSignedIn, account } = useWallet();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: isDarkMode
            ? "var(--color-surface-dark)"
            : "var(--color-surface-light)",
          border: "none",
          padding: "var(--spacing-lg)",
        },
      }}
    >
      <h1 className="header-brand">EquitX</h1>

      <List disablePadding sx={{ mt: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: isDarkMode
              ? "var(--color-text-secondary-dark)"
              : "var(--color-text-secondary-light)",
            px: 2,
            mb: 1,
            display: "block",
          }}
        >
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

        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: isDarkMode
              ? "var(--color-text-secondary-dark)"
              : "var(--color-text-secondary-light)",
            px: 2,
            mt: 3,
            mb: 1,
            display: "block",
          }}
        >
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

        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: isDarkMode
              ? "var(--color-text-secondary-dark)"
              : "var(--color-text-secondary-light)",
            px: 2,
            mt: 3,
            mb: 1,
            display: "block",
          }}
        >
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
    </Drawer>
  );
}
