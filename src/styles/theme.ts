import { createTheme } from '@mui/material/styles';

const black = "#000000";
const white = "#ffffff";
const darkGray = "#1A1C21";
const gray = "#707070";
const mediumGray = "#AEAEAE";
const lightGray = "#F3F4F6";

const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: mode === 'dark' ? black : white,
      paper: mode === 'dark' ? darkGray : lightGray,
    },
    text: {
      primary: mode === 'dark' ? lightGray : darkGray,
      secondary: mode === 'dark' ? gray : darkGray,
    },
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#10b981',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#3b82f6',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            color: mode === 'dark' ? lightGray : darkGray,
          },
          '& .MuiInputLabel-root': {
            color: mode === 'dark' ? gray : darkGray,
            background: 'transparent',
            fontSize: 16,
          },
          '& .MuiInputLabel-shrink': {
            background: mode === 'dark' ? darkGray : lightGray,
            padding: '0 4px',
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: mode === 'dark' ? darkGray : lightGray,
            },
            '&:hover fieldset': {
              borderColor: '#3b82f6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#f3f4f6',
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: mode === 'dark' ? white : lightGray,
            '&:hover': {
              backgroundColor: mode === 'dark' ? mediumGray : 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          padding: '0.75rem 1.5rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow:
            mode === 'dark'
              ? '0 1px 3px rgb(0, 0, 0)'
              : '0 1px 3px rgb(0, 0, 0, 0.10)',
          '&.MuiPaper-elevation0': {
            backgroundColor: mode === 'dark' ? darkGray : white,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            mode === 'dark'
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          backgroundColor: mode === 'dark' ? darkGray : lightGray,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: '"Helvetica"',
        }
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? lightGray : darkGray,
        },
        h1: {
          color: mode === 'dark' ? lightGray : darkGray,
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h2: {
          color: mode === 'dark' ? lightGray : darkGray,
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h3: {
          color: mode === 'dark' ? lightGray : darkGray,
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h4: {
          color: mode === 'dark' ? lightGray : darkGray,
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h5: {
          color: mode === 'dark' ? lightGray : darkGray,
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h6: {
          color: mode === 'dark' ? lightGray : darkGray,
          marginBottom: '1rem',
          fontWeight: 600,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Instrument Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
    },
  },
});

export const lightTheme = getTheme('light');
export const darkTheme = getTheme('dark');
 
