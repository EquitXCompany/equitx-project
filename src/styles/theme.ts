import { createTheme } from "@mui/material/styles";
import { tabClasses } from "@mui/material/Tab";

const black = "#000000";
const white = "#ffffff";
const darkGray = "#1A1C21";
const dimGray = "#2A2C33";
const darkSurface = "#3d3f47";
const gray = "#707070";
const mediumGray = "#AEAEAE";
const lightGray = "#F3F4F6";

declare module "@mui/material/styles" {
  interface Palette {
    default: Palette["primary"];
  }
  interface PaletteOptions {
    default: PaletteOptions["primary"];
  }
}

const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#3b82f6",
        light: "#60a5fa",
        dark: "#2563eb",
      },
      secondary: {
        main: "#8b5cf6",
        light: "#a78bfa",
        dark: "#7c3aed",
      },
      default: {
        main: mode === "dark" ? lightGray : darkGray,
        light: mode === "dark" ? white : dimGray,
        dark: mode === "dark" ? gray : black,
      },
      background: {
        default: mode === "dark" ? black : white,
        paper: mode === "dark" ? dimGray : lightGray,
      },
      text: {
        primary: mode === "dark" ? lightGray : darkGray,
        secondary: mode === "dark" ? gray : darkGray,
      },
      error: {
        main: "#ef4444",
      },
      success: {
        main: "#10b981",
      },
      warning: {
        main: "#f59e0b",
      },
      info: {
        main: "#3b82f6",
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiInputBase-input": {
              color: mode === "dark" ? lightGray : darkGray,
            },
            "& .MuiInputLabel-root": {
              color: mode === "dark" ? gray : darkGray,
              background: "transparent",
              fontSize: 16,
            },
            "& .MuiInputLabel-shrink": {
              background: mode === "dark" ? darkGray : lightGray,
              padding: "0 4px",
            },
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: mode === "dark" ? darkGray : lightGray,
              },
              "&:hover fieldset": {
                borderColor: "#3b82f6",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#f3f4f6",
              },
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            marginBottom: "4px",
            transition: "all 150ms ease",
            "&.Mui-selected": {
              backgroundColor:
                mode === "dark"
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(59, 130, 246, 0.1)",
              "&:hover": {
                backgroundColor:
                  mode === "dark"
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(59, 130, 246, 0.15)",
              },
            },
            "&:hover": {
              backgroundColor:
                mode === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            fontWeight: 600,
            padding: "0.75rem 1.5rem",
          },
          contained: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow:
              mode === "dark"
                ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                : "0 1px 3px rgba(0, 0, 0, 0.1)",
            borderRadius: 12,
            "&.MuiPaper-elevation0": {
              backgroundColor: mode === "dark" ? darkGray : white,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow:
              mode === "dark"
                ? "0 4px 6px rgba(0, 0, 0, 0.1)"
                : "0 4px 6px rgba(0, 0, 0, 0.1)",
            backgroundColor: mode === "dark" ? dimGray : lightGray,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
            transition: "transform 150ms ease, box-shadow 150ms ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow:
                mode === "dark"
                  ? "0 10px 15px rgba(0, 0, 0, 0.2)"
                  : "0 10px 15px rgba(0, 0, 0, 0.1)",
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontFamily: '"Helvetica"',
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? lightGray : darkGray,
          },
          h1: {
            color: mode === "dark" ? lightGray : darkGray,
            marginBottom: "1rem",
            fontWeight: 600,
          },
          h2: {
            color: mode === "dark" ? lightGray : darkGray,
            marginBottom: "1rem",
            fontWeight: 600,
          },
          h3: {
            color: mode === "dark" ? lightGray : darkGray,
            marginBottom: "1rem",
            fontWeight: 600,
          },
          h4: {
            color: mode === "dark" ? lightGray : darkGray,
            marginBottom: "1rem",
            fontWeight: 600,
          },
          h5: {
            color: mode === "dark" ? lightGray : darkGray,
            marginBottom: "1rem",
            fontWeight: 600,
          },
          h6: {
            color: mode === "dark" ? lightGray : darkGray,
            marginBottom: "1rem",
            fontWeight: 600,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? black : white,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            opacity: 1,
            overflow: "initial",
            paddingLeft: "90px",
            paddingRight: "90px",
            borderTopLeftRadius: "25px",
            borderTopRightRadius: "25px",
            color: mode === "dark" ? lightGray : darkGray,
            backgroundColor: mode === "dark" ? dimGray : lightGray,
            transition: "0.2s",
            zIndex: 2,
            marginTop: "4px",
            textTransform: "uppercase",
            font: "normal normal 600 20px/24px Instrument Sans",
            "&:before": {
              transition: "0.2s",
            },
            "&:first-of-type": {
              "--r": "25px",
              margin: "0 -25px 0 0",
              lineHeight: "1.8",
              borderRight: "var(--r) solid #0000",
              borderRadius: "var(--r) calc(2*var(--r)) 0 0/var(--r)",
              mask: `
              radial-gradient(var(--r) at 100% 0,#0000 98%,#000 101%)
              100% 100%/var(--r) var(--r) no-repeat,
              conic-gradient(#000 0 0) padding-box;
              `,
              background: mode === "dark" ? dimGray : lightGray,
              width: "fit-content",
            },
            "&:not(:first-of-type)": {
              "--r": "25px",
              margin: "0 -25px",
              lineHeight: "1.8",
              borderInline: "var(--r) solid #0000",
              borderRadius: " calc(2*var(--r)) calc(2*var(--r)) 0 0/var(--r)",
              mask: `radial-gradient(var(--r) at var(--r) 0,#0000 98%,#000 101%)
                calc(-1*var(--r)) 100%/100% var(--r) repeat-x,
                conic-gradient(#000 0 0) padding-box;`,
              background: mode === "dark" ? dimGray : lightGray,
              width: "fit-content",
              "&:before": {
                content: '" "',
                position: "absolute",
                left: 0,
                display: "block",
                height: 20,
                width: "1px",
                zIndex: 1,
                marginTop: "4px",
                backgroundColor: mode === "dark" ? darkGray : lightGray,
              },
            },
            [`& + .${tabClasses.selected}::before`]: {
              opacity: 0,
            },
            "&:hover": {
              [`&:not(.${tabClasses.selected})`]: {
                backgroundColor: "rgba(255 255 255 / 55%)",
              },
              "&::before": {
                opacity: 0,
              },
              [`& + .${tabClasses.root}::before`]: {
                opacity: 0,
              },
            },
            [`&.${tabClasses.selected}`]: {
              backgroundColor: mode === "dark" ? darkGray : lightGray,
              color: mode === "dark" ? lightGray : darkGray,
            },
            [`&.${tabClasses.selected} + .${tabClasses.root}`]: {
              zIndex: 1,
            },
            [`&.${tabClasses.selected} + .${tabClasses.root}::before`]: {
              opacity: 0,
            },
          },
        },
      },
    },
    typography: {
      fontFamily:
        '"Instrument Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      button: {
        textTransform: "none",
      },
    },
  });

export const lightTheme = getTheme("light");
export const darkTheme = getTheme("dark");
