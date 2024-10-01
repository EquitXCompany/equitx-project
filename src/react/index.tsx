import { StrictMode } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../styles/theme';
import cdps from "./routes/cdps";
import errorElement from "./routes/error";

const router = createHashRouter([
  {
    path: "/",
    errorElement,
    ...cdps,
  },
]);

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    </ThemeProvider>
  );
}
