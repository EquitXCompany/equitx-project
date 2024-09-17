import { StrictMode } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
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
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
