import { DataSource, DataSourceOptions } from "typeorm";
import { Asset } from "./entity/Asset";
import { PriceHistory } from "./entity/PriceHistory";
import { CDP } from "./entity/CDP";
import { Staker } from "./entity/Staker";
import { LiquidityPool } from "./entity/LiquidityPool";
import { ContractState } from "./entity/ContractState";
import { LastQueriedTimestamp } from "./entity/LastQueriedTimestamp";

const config: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "equitxindexer",
  entities: [Asset, PriceHistory, CDP, Staker, LiquidityPool, ContractState, LastQueriedTimestamp ],
  synchronize: false,
  migrations: [__dirname + "/../migration/*.ts"],
};

export const AppDataSource = new DataSource(config);