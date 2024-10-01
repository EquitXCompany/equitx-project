import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4d8cc8', // --color-light-blue
    },
    secondary: {
      main: '#e67e22', // --color-orange
    },
    background: {
      default: '#1a4266', // --color-dark-blue
      paper: '#264c73', // Slightly lighter than --color-dark-blue
    },
    text: {
      primary: '#f2e8c9', // --color-cream
      secondary: '#e67e22', // --color-orange
    },
    error: {
      main: '#c0392b', // --color-red
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            color: '#fefae0', // --color-cream
          },
          '& .MuiInputLabel-root': {
            color: '#dda15e', // --color-light-orange
            background: 'transparent', // Make label background transparent
            margin: 0,
            fontSize: 20,
          },
          '& .MuiInputLabel-shrink': {
            background: '#264c73', // Match with your background color
            transform: 'translate(14px, -9px) scale(0.75)', // Adjust label position
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#606c38', // --color-olive
            },
            '&:hover fieldset': {
              borderColor: '#dda15e', // --color-light-orange
            },
            '&.Mui-focused fieldset': {
              borderColor: '#bc6c25', // --color-dark-orange
            },
          },
          '& .MuiFormHelperText-root': {
            color: '#dda15e', // --color-light-orange
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#606c38', // --color-olive
          color: '#fefae0', // --color-cream
          '&:hover': {
            backgroundColor: '#dda15e', // --color-light-orange
          },
        },
      },
    },
    // Add other component overrides as needed
  },
});

export default theme;
