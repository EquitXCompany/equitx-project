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
import Navbar, { drawerWidth } from "./components/Navbar";
import { Box } from "@mui/material";
import ViewHeader from "./components/ViewHeader";
import Dashboard from "./components/Dashboard";
import CDPStats from "./components/CDPStats";
import StabilityPoolStats from "./components/StabilityPoolStats";
import AdminPanel from "./components/AdminPanel";
import { ContractMappingProvider } from "../contexts/ContractMappingContext";
import Portfolio from "./routes/portfolio";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const xAssetTitle = ({ assetSymbol }: { assetSymbol: string }) =>
  `x${assetSymbol.slice(1).toUpperCase()}`;

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
              minHeight: "100vh",
              paddingLeft: "var(--spacing-md)",
              paddingRight: "var(--spacing-md)",
              paddingBottom: "var(--spacing-md)",
              width: `calc(100vw - ${drawerWidth}px)`,
              overflowX: "hidden",
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
        handle: { title: () => "Protocol Overview" },
      },
      {
        path: "cdps/:assetSymbol",
        handle: { title: xAssetTitle },
        ...cdps,
      },
      {
        path: "cdps",
        element: <CDPStats />,
        handle: { title: () => "CDP Overview" },
        errorElement,
      },
      {
        path: "stability-pools",
        element: <StabilityPoolStats />,
        handle: { title: () => "Stability Pools" },
        errorElement,
      },
      {
        path: "stability-pool/:assetSymbol",
        element: <StabilityPool />,
        handle: { title: xAssetTitle },
        errorElement,
      },
      {
        path: "portfolio",
        element: <Portfolio />,
        handle: { title: () => "Portfolio" },
        errorElement,
      },
      {
        path: "admin",
        element: <AdminPanel />,
        handle: { title: "Admin" },
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
