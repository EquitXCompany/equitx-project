import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import cron from "node-cron";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { AppDataSource } from "./ormconfig";
import assetRoutes from "./routes/assetRoutes";
import priceHistoryRoutes from "./routes/priceHistoryRoutes";
import cdpRoutes from "./routes/cdpRoutes";
import stakerRoutes from "./routes/stakerRoutes";
import liquidityPoolRoutes from "./routes/liquidityPoolRoutes";
import singletonRoutes from "./routes/singletonRoutes";
import tvlMetricsRoutes from "./routes/tvlMetricsRoutes";
import utilizationMetricsRoutes from "./routes/utilizationMetricsRoutes";
import cdpMetricsRoutes from "./routes/cdpMetricsRoutes";
import liquidationRoutes from "./routes/liquidationRoutes";
import protocolStatsRoutes from "./routes/protocolStatsRoutes";
import userMetricsRoutes from "./routes/userMetricsRoutes";
import adminRoutes from "./routes/adminRoutes";

import { startCDPUpdateJob } from "./scripts/updateCDPs";
import { startPriceUpdateJob } from "./scripts/updatePrices";
import { createAssetsIfNotExist } from "./scripts/createAssets";
import { assetConfig } from "./config/AssetConfig";
import { startStakeUpdateJob } from "./scripts/updateStakes";
import { calculateCDPMetrics, runDailyMetrics } from "./scripts/dailyMetrics";

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENTPORT = process.env.CLIENTPORT || 4321;

// Middleware
const corsOptions = {
  origin: ['https://equitxcompany.github.io', 'http://localhost:' + CLIENTPORT],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
    app.use(express.json());

app.set('trust proxy', 2);
app.get('/', (_, res) => { res.json({ status: 'OK' }) });
app.get('/ip', (req, res) => { res.send(req.ip) });
app.options('*', cors(corsOptions));
async function initializeRoutes() {
  const assetRouter = await assetRoutes();
  const priceHistoryRouter = await priceHistoryRoutes();
  const cdpRouter = await cdpRoutes();
  const stakerRouter = await stakerRoutes();
  const liquidityPoolRouter = await liquidityPoolRoutes();
  const singletonRouter = await singletonRoutes();
  const tvlMetricsRouter = await tvlMetricsRoutes();
  const utilizationMetricsRouter = await utilizationMetricsRoutes();
  const cdpMetricsRouter = await cdpMetricsRoutes();
  const liquidationRouter = await liquidationRoutes();
  const protocolStatsRouter = await protocolStatsRoutes();
  const userMetricsRouter = await userMetricsRoutes();

  app.use("/api/assets", assetRouter);
  app.use("/api/price-history", priceHistoryRouter);
  app.use("/api/cdps", cdpRouter);
  app.use("/api/stakers", stakerRouter);
  app.use("/api/liquiditypools", liquidityPoolRouter);
  app.use("/api/singletons", singletonRouter);
  app.use("/api/tvl", tvlMetricsRouter);
  app.use("/api/utilization", utilizationMetricsRouter);
  app.use("/api/cdp-metrics", cdpMetricsRouter);
  app.use("/api/liquidations", liquidationRouter);
  app.use("/api/protocol-stats", protocolStatsRouter);
  app.use("/api/user-metrics", userMetricsRouter);
  app.use("/api/admin", adminRoutes);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
    });

AppDataSource.initialize()
  .then(async () => {
    console.log("Database connection established");

    await initializeRoutes();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    await createAssetsIfNotExist(assetConfig);

    cron.schedule('*/15 * * * *', async () => {
      console.log('Running CDP metrics update...');
      await calculateCDPMetrics();
    });

    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily metrics calculation...');
      await runDailyMetrics();
    });

    startPriceUpdateJob();
    startCDPUpdateJob();
    startStakeUpdateJob();
    runDailyMetrics();
  })
  .catch((error) => console.log("TypeORM connection error: ", error));