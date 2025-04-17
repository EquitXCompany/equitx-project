import { StrictMode } from "react";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { ThemeProvider as MUIThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "react-query";
import { lightTheme, darkTheme } from "../styles/theme";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import cdps from "./routes/cdps";
import errorElement from "./routes/error";
import StabilityPool from "./routes/stabilityPool";
import Navbar from "./components/Navbar";
import { Box } from "@mui/material";
import ViewHeader from "./components/ViewHeader";
import Dashboard from "./components/Dashboard";
import CDPStats from "./components/CDPStats";
import StabilityPoolStats from "./components/StabilityPoolStats";
import AdminPanel from "./components/AdminPanel";
import { ContractMappingProvider } from "../contexts/ContractMappingContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createHashRouter([
  {
    path: "/",
    element: (
      <Box sx={{ display: "flex" }}>
        <ContractMappingProvider>
          <Navbar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: "$(window).innerWidth() + 'px'",
              height: "$(window).innerHeight() + 'px'",
              overflow: "auto",
            }}
          >
            <ViewHeader />
            <Outlet />
          </Box>
        </ContractMappingProvider>
      </Box>
    ),
    errorElement,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "cdps/:assetSymbol",
        ...cdps,
      },
      {
        path: "cdps",
        element: <CDPStats />,
        errorElement,
      },
      {
        path: "stability-pools",
        element: <StabilityPoolStats />,
        errorElement,
      },
      {
        path: "stability-pool/:assetSymbol",
        element: <StabilityPool />,
        errorElement,
      },
      {
        path: "admin",
        element: <AdminPanel />,
        errorElement,
      },
    ],
  },
]);

function AppContent() {
  const { isDarkMode } = useTheme();
  return (
    <MUIThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    </MUIThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}