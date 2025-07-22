import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
} from "@mui/material";
import Chevron from "./common/Chevron";
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
import { useContractMapping } from "../../contexts/ContractMappingContext";
import { ADMIN_ADDRESS } from "../../constants";

const drawerWidth = 280;
const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScIw31uG19BYszyMnKeDfRo4-UnbKAkHxQWBhpYvtdFEr-F-g/viewform?usp=dialog";

export default function Navbar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const selectedBG = isDarkMode ? "#FFFFFF" : "#E5E5E5";
  const hoverBG = isDarkMode ? "#2B2D32" : "#F5F5F5";
  const { isSignedIn, account } = useWallet();
  const contractMapping = useContractMapping();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 64,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 64,
          transition: "width 0.3s ease",
          overflowX: "hidden",
          border: 0,
        },
        "& .MuiListItemButton-root": {
          whiteSpace: "nowrap",
          padding: open ? "0.5rem 2rem" : "0.5rem 1.2rem",
        },
        "& .MuiListItemButton-root.sub-item": {
          paddingLeft: "5.5rem",
        },
        "& .MuiListItemButton-root.Mui-selected, & .MuiListItemButton-root.Mui-selected:hover":
          {
            background: open
              ? `url("data:image/svg+xml,%3Csvg width='42' height='75' xmlns='http://www.w3.org/2000/svg' fill='none'%3E%3Cpath fill='${encodeURIComponent(selectedBG)}' d='m40.5289,36.44c-17.85,-11.2 -23.7499,-31.52 -24.7999,-35.68c-0.11,-0.44 -0.51,-0.76 -0.97,-0.76c-3.54419,0.0625 -10.77728,0.0625 -14.69647,0.0625l0.12642,74.515l14.55996,0.0625c0.46,0 0.86,-0.31 0.97,-0.76c1.04,-4.17 6.9501,-24.55 24.8001,-35.75c0.63,-0.4 0.63,-1.3 0,-1.7l0.0099,0.01z'/%3E%3C/svg%3E%0A") no-repeat right center, linear-gradient(to right, ${selectedBG} 90%, transparent 90%)`
              : selectedBG,
          },
        "& .MuiListItemButton-root:hover": {
          background: open
            ? `url("data:image/svg+xml,%3Csvg width='42' height='75' xmlns='http://www.w3.org/2000/svg' fill='none'%3E%3Cpath fill='${encodeURIComponent(hoverBG)}' d='m40.5289,36.44c-17.85,-11.2 -23.7499,-31.52 -24.7999,-35.68c-0.11,-0.44 -0.51,-0.76 -0.97,-0.76c-3.54419,0.0625 -10.77728,0.0625 -14.69647,0.0625l0.12642,74.515l14.55996,0.0625c0.46,0 0.86,-0.31 0.97,-0.76c1.04,-4.17 6.9501,-24.55 24.8001,-35.75c0.63,-0.4 0.63,-1.3 0,-1.7l0.0099,0.01z'/%3E%3C/svg%3E%0A") no-repeat right center, linear-gradient(to right, ${hoverBG} 90%, transparent 90%)`
            : hoverBG,
        },
        "& .MuiListItemIcon-root": {
          minWidth: 36,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          p: "2rem 2rem 3rem",
        }}
      >
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            ml: open ? "auto" : "unset",
            mr: open ? "-1rem" : "unset",
            p: "12px",
          }}
        >
          <Chevron open={open} isDarkMode={isDarkMode} />
        </IconButton>
      </Box>
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            selected={location.pathname === "/"}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Dashboard" />}
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
              {open && <ListItemText primary="Admin" />}
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
            {open && <ListItemText primary="Portfolio" />}
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/cdps"
            selected={location.pathname === "/cdps"}
          >
            <ListItemIcon>
              <CDPIcon />
            </ListItemIcon>
            {open && <ListItemText primary="CDPs" />}
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
            {open && <ListItemText primary="Stability Pools" />}
          </ListItemButton>
        </ListItem>

        {open &&
          contractMapping &&
          Object.keys(contractMapping)
            .sort()
            .map((symbol) => (
              <ListItem key={symbol} disablePadding>
                <ListItemButton
                  className="sub-item"
                  component={Link}
                  to={`/cdps/${symbol}`}
                  selected={location.pathname === `/cdps/${symbol}`}
                >
                  <ListItemText primary={symbol} />
                </ListItemButton>
              </ListItem>
            ))}

        <ListItem disablePadding>
          <ListItemButton
            disableRipple
            sx={{
              "&:hover": {
                background: "transparent !important",
                cursor: "default",
              },
            }}
          >
            <ListItemIcon>
              <FeedbackIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Help" />}
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            className="sub-item"
            component="a"
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ListItemText primary="Contact Us" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}
