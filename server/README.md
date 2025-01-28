# CDP Indexer Server

A TypeScript-based server for indexing and tracking CDPs (Collateralized Debt Positions), staker positions, and price feeds on the Stellar blockchain.

## Overview

This server provides an indexing service that:
- Tracks and indexes CDPs (Collateralized Debt Positions)
- Monitors staker positions and liquidity pools
- Records price history from oracle feeds
- Provides REST API endpoints to query indexed data
- Automatically liquidates insolvent CDPs

## Tech Stack

- TypeScript
- Node.js
- Express
- TypeORM
- PostgreSQL
- Stellar SDK

## Key Features

- Real-time CDP tracking and status updates
- Automated CDP liquidation for insolvent positions
- Price feed indexing from oracle sources
- REST API for querying indexed data
- Cron jobs for periodic updates

## Database Schema

The database includes the following main entities:

- `Asset` - Base asset information and relationships
- `CDP` - Collateralized Debt Position details
- `Staker` - Staking position information  
- `LiquidityPool` - Liquidity pool data
- `PriceHistory` - Historical price data
- `ContractState` - Key-value storage for contract state

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres 
DB_PASSWORD=postgres
PORT=3000
RETROSHADE_API_TOKEN=your_api_token
```

3. Run database migrations:
```bash
npm run migration:run
```

4. Start the server:
```bash
npm run start
```

For development:
```bash 
npm run dev
```

## API Routes

- `/api/assets` - Asset information
- `/api/cdps` - CDP data
- `/api/stakers` - Staker positions 
- `/api/liquiditypools` - Liquidity pool info
- `/api/pricehistories` - Price feed history
- `/api/contractstate` - Contract state data

## Scripts

- `updateCDPs.ts` - Cron job to update CDP status and handle liquidations
- `createAssets.ts` - Initialize asset records and related tables

## Database Migrations

To generate new migrations:

1. Make changes to your entity files in `src/entity/`

2. Generate a new migration:
```bash
npm run typeorm migration:generate -- -d src/ormconfig.ts migration/[name]
```

3. The generated migration will be placed in the `migration/` directory with a timestamp prefix

4. Review the generated migration file to ensure it captures your intended changes

5. Run pending migrations:
```bash
npm run migration:run
```

To revert the last migration:
```bash
npm run migration:revert
```

## Development

Build the project:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## License

[License Type]