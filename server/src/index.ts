import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { AppDataSource } from "./ormconfig";
import assetRoutes from "./routes/assetRoutes";
import priceHistoryRoutes from "./routes/priceHistoryRoutes";
import cdpRoutes from "./routes/cdpRoutes";
import stakerRoutes from "./routes/stakerRoutes";
import liquidityPoolRoutes from "./routes/liquidityPoolRoutes";
import singletonRoutes from "./routes/singletonRoutes";
import { startCDPUpdateJob } from "./scripts/updateCDPs";
import { startPriceUpdateJob } from "./scripts/updatePrices";
import { createAssetsIfNotExist } from "./scripts/createAssets";
import { assetConfig } from "./config/AssetConfig";
import { startStakeUpdateJob } from "./scripts/updateStakes";

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENTPORT = process.env.CLIENTPORT || 4321;

const corsOptions = {
  origin: ['https://equitxcompany.github.io', 'http://localhost:' + CLIENTPORT],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

async function initializeRoutes() {
  const assetRouter = await assetRoutes();
  const priceHistoryRouter = await priceHistoryRoutes();
  const cdpRouter = await cdpRoutes();
  const stakerRouter = await stakerRoutes();
  const liquidityPoolRouter = await liquidityPoolRoutes();
  const singletonRouter = await singletonRoutes();

  app.use("/api/assets", assetRouter);
  app.use("/api/pricehistories", priceHistoryRouter);
  app.use("/api/cdps", cdpRouter);
  app.use("/api/stakers", stakerRouter);
  app.use("/api/liquiditypools", liquidityPoolRouter);
  app.use("/api/singletons", singletonRouter);
}

AppDataSource.initialize()
  .then(async () => {
    console.log("Database connection established");

    app.use(express.json());

    // Initialize routes
    await initializeRoutes();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // add any new assets if needed
    await createAssetsIfNotExist(assetConfig);

    startPriceUpdateJob();

    startCDPUpdateJob();

    startStakeUpdateJob();
  })
  .catch((error) => console.log("TypeORM connection error: ", error));