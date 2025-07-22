# Mock Service Worker (MSW) Setup

This directory contains the Mock Service Worker (MSW) configuration for the EquitX project. MSW allows us to intercept network requests and provide mock responses during development and testing.

## Overview

MSW is configured to run only in development mode when explicitly enabled via an environment variable. This ensures that mocking doesn't interfere with production builds or normal development workflow.

## Files

- `handlers.ts` - Contains all the mock API handlers
- `browser.ts` - Browser-specific MSW setup and initialization
- `index.ts` - Main entry point for mocks
- `README.md` - This documentation

## Usage

### Enabling MSW in Development

To run the application with MSW enabled, use the dedicated npm script:

```bash
npm run dev:mock
```

This will:
1. Set the `PUBLIC_ENABLE_MSW=true` environment variable
2. Build the contracts
3. Start the Astro development server with MSW enabled

### Manual Environment Variable

Alternatively, you can set the environment variable manually:

```bash
PUBLIC_ENABLE_MSW=true npm run dev
```

### Environment Variables

- `PUBLIC_ENABLE_MSW` - Set to `'true'` to enable MSW in development
- MSW only runs when `import.meta.env.DEV` is true (development mode)

## API Endpoints Mocked

The following API endpoints are currently mocked:

### Protocol Statistics
- `GET /api/protocol-stats/latest` - Latest protocol statistics
- `GET /api/protocol-stats/history` - Historical protocol statistics

### CDP Metrics
- `GET /api/cdp-metrics/:asset/latest` - Latest CDP metrics for an asset
- `GET /api/cdp-metrics/:asset/history` - Historical CDP metrics for an asset

### TVL Metrics
- `GET /api/tvl/:asset/latest` - Latest TVL metrics for an asset
- `GET /api/tvl-metrics/:asset/history` - Historical TVL metrics for an asset

### Catch-All Handler
- `* *` - Logs unmatched requests and returns 404 for API requests

## Mock Data

Mock data is generated using `@faker-js/faker` to create realistic test data including:

- Financial metrics (TVL, debt, volume)
- User statistics (active users, CDPs)
- Risk metrics (collateral ratios, liquidation events)
- Historical data points (30 days of data)

## Console Logging

MSW provides detailed console logging to help with debugging:

- `[MSW] Starting mock service worker...` - When MSW is initializing
- `[MSW] Mock service worker started successfully` - When MSW is ready
- `[MSW] Intercepted GET /api/...` - When a request is intercepted
- `[MSW] Unmatched METHOD request to URL` - When a request is not handled

## Adding New Handlers

To add a new API endpoint handler:

1. Add the handler to `handlers.ts`:

```typescript
http.get('/api/your-endpoint', () => {
  console.log('[MSW] Intercepted GET /api/your-endpoint');
  return HttpResponse.json({ your: 'data' });
}),
```

2. Add any necessary mock data generators
3. The handler will automatically be included when MSW starts

## Testing

MSW can also be used in tests. The handlers are exported from `index.ts` and can be imported in test files:

```typescript
import { handlers } from '../mocks';
import { setupServer } from 'msw/node';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Troubleshooting

### MSW Not Starting
- Ensure `PUBLIC_ENABLE_MSW=true` is set
- Check that you're in development mode (`npm run dev` or `npm run dev:mock`)
- Look for MSW console messages in the browser developer tools

### Requests Not Being Intercepted
- Check that the endpoint is defined in `handlers.ts`
- Verify the request URL matches the handler pattern
- Look for "Unmatched request" warnings in the console

### Memory Leak Warning
If you see "MaxListenersExceededWarning" in the console, this indicates multiple MSW instances. The setup includes:
- Singleton pattern to prevent multiple worker instances
- Proper initialization promise handling
- Cleanup on component unmount

This should be resolved automatically, but if it persists:
1. Check that MSW is only initialized once
2. Ensure the React app component isn't being re-rendered excessively
3. Verify the cleanup function is working properly

### Mock Service Worker File Missing
If you get errors about `mockServiceWorker.js`, run:

```bash
npx msw init public --save
```

This will regenerate the service worker file in the `public` directory.

## Production

MSW is automatically disabled in production builds. The mocking code is only included in development builds and will not affect production performance or bundle size.