import { createTheme } from '@mui/material/styles';

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
      default: mode === 'dark' ? '#111827' : '#ffffff',
      paper: mode === 'dark' ? '#1f2937' : '#f3f4f6',
    },
    text: {
      primary: mode === 'dark' ? '#f3f4f6' : '#111827',
      secondary: mode === 'dark' ? '#9ca3af' : '#4b5563',
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
            color: mode === 'dark' ? '#f3f4f6' : '#111827',
          },
          '& .MuiInputLabel-root': {
            color: mode === 'dark' ? '#9ca3af' : '#4b5563',
            background: 'transparent',
            fontSize: 16,
          },
          '& .MuiInputLabel-shrink': {
            background: mode === 'dark' ? '#1f2937' : '#f3f4f6',
            padding: '0 4px',
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: mode === 'dark' ? '#374151' : '#d1d5db',
            },
            '&:hover fieldset': {
              borderColor: '#3b82f6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
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
          backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff', // Solid colors with no transparency
          backgroundImage: 'none',
          boxShadow: mode === 'dark' 
            ? '0 1px 3px rgb(0, 0, 0)'
            : '0 1px 3px rgb(0, 0, 0, 0.10)',
          '&.MuiPaper-root': {
            backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'dark'
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          backgroundColor: mode === 'dark' ? '#1f2937' : '#f3f4f6',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
        },
        h1: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h2: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h3: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h4: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h5: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
          marginBottom: '1rem',
          fontWeight: 600,
        },
        h6: {
          color: mode === 'dark' ? '#f3f4f6' : '#111827',
          marginBottom: '1rem',
          fontWeight: 600,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
    },
  },
});

export const lightTheme = getTheme('light');
export const darkTheme = getTheme('dark');