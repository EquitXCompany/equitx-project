import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountBalance as CDPIcon,
  Pool as PoolIcon,
  ChevronLeft as ChevronLeftIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { contractMapping } from '../../contracts/contractConfig';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../wallet';

const drawerWidth = 240;

export default function Navbar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isSignedIn } = useWallet();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 64,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : 64,
          transition: 'width 0.2s',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
        {open && <Typography variant="h6">EquitX</Typography>}
        <IconButton onClick={handleDrawerToggle} sx={{ ml: 'auto' }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            selected={location.pathname === '/'}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Dashboard" />}
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/cdps"
            selected={location.pathname === '/cdps'}
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
            selected={location.pathname === '/stability-pools'}
          >
            <ListItemIcon>
              <PoolIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Stability Pools" />}
          </ListItemButton>
        </ListItem>

        {isSignedIn && (
        <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin"
              selected={location.pathname === '/admin'}
            >
              <ListItemIcon>
                <AdminIcon />
              </ListItemIcon>
              {open && <ListItemText primary="Admin" />}
            </ListItemButton>
          </ListItem>
        )}

        {open && <Divider sx={{ my: 1 }} />}

        <ListItem disablePadding>
          <ListItemButton onClick={toggleTheme}>
            <ListItemIcon>
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            {open && <ListItemText primary={`${isDarkMode ? 'Light' : 'Dark'} Mode`} />}
          </ListItemButton>
        </ListItem>

        {open && Object.keys(contractMapping).map((symbol) => (
          <ListItem key={symbol} disablePadding>
            <ListItemButton
              component={Link}
              to={`/cdps/${symbol}`}
              selected={location.pathname === `/cdps/${symbol}`}
              sx={{ pl: 4 }}
            >
              <ListItemText primary={symbol} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}