import "reflect-metadata";
import express from "express";
import { DataSource } from "typeorm";
import ormconfig from "./config/ormconfig";
import assetRoutes from "./routes/assetRoutes";
import pricefeedRoutes from "./routes/pricefeedRoutes";
import cdpRoutes from "./routes/cdpRoutes";
import stakerRoutes from "./routes/stakerRoutes";
import liquidityPoolRoutes from "./routes/liquidityPoolRoutes";
import singletonRoutes from "./routes/singletonRoutes";
import { startCDPUpdateJob } from "./scripts/updateCDPs";

const app = express();
const PORT = process.env.PORT || 3000;

const AppDataSource = new DataSource(ormconfig);

AppDataSource.initialize()
  .then(() => {
    console.log("Database connection established");

    app.use(express.json());

    // Routes
    app.use("/api/assets", assetRoutes);
    app.use("/api/pricefeeds", pricefeedRoutes);
    app.use("/api/cdps", cdpRoutes);
    app.use("/api/stakers", stakerRoutes);
    app.use("/api/liquiditypools", liquidityPoolRoutes);
    app.use("/api/singletons", singletonRoutes);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    startCDPUpdateJob();
  })
  .catch((error) => console.log("TypeORM connection error: ", error));
