import { StrictMode } from "react";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import theme from '../styles/theme';
import cdps from "./routes/cdps";
import errorElement from "./routes/error";
import StabilityPool from "./routes/stabilityPool";
import Navbar from "./components/Navbar";
import { Box } from "@mui/material";
import Dashboard from "./components/Dashboard";
import CDPStats from "./components/CDPStats";
import StabilityPoolStats from "./components/StabilityPoolStats";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  }
});

const router = createHashRouter([
  {
    path: "/",
    element: (
      <Box sx={{ display: 'flex' }}>
        <Navbar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
          }}
        >
          <Outlet />
        </Box>
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
        element: <CDPStats/>,
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
}
    ]
  }
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StrictMode>
          <RouterProvider router={router} />
        </StrictMode>
      </ThemeProvider>
    </QueryClientProvider>
  );
}