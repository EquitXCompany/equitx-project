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
  Divider,
} from '@mui/material';
import Chevron from './common/Chevron';
import {
  Dashboard as DashboardIcon,
  AccountBalance as CDPIcon,
  Pool as PoolIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  AdminPanelSettings as AdminIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { contractMapping } from '../../contracts/contractConfig';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../wallet';

const drawerWidth = 240;
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScIw31uG19BYszyMnKeDfRo4-UnbKAkHxQWBhpYvtdFEr-F-g/viewform?usp=dialog';

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
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, flexDirection: 'column' }}>
        <IconButton onClick={handleDrawerToggle} sx={{ ml: 'auto' }}>
          <Chevron open={open} onClick={handleDrawerToggle} isDarkMode={isDarkMode}/>
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
            {open && <ListItemText primary="Give Feedback" />}
          </ListItemButton>
        </ListItem>

        {open && <Divider sx={{ my: 1 }} />}

        <ListItem disablePadding>
          <ListItemButton onClick={toggleTheme}>
            <ListItemIcon>
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            {open && <ListItemText primary={`${isDarkMode ? 'Light' : 'Dark'} Mode`} />}
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}
