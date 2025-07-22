const assetRegex =
  /\.(ts|tsx|js|jsx|json|svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2|ttf|eot)$/i;

// Simple MSW enabler following the quickstart approach
export async function enableMocking() {
  // Only enable in development when explicitly enabled
  if (!import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_MOCKS !== "true") {
    return;
  }

  console.log("[MSW] Starting mock service worker...");

  const { worker } = await import("./browser");

  // Start the service worker
  await worker.start({
    onUnhandledRequest: (req, print) => {
      // Ignore requests for static assets
      const url = new URL(req.url);
      if (assetRegex.test(url.pathname)) return;

      // Log all other unhandled requests
      print.warning();
    },
  });

  console.log("[MSW] Mock service worker started successfully");
}
