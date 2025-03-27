import { RequestHandler } from "express";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { getLatestPriceData, SERVER_KEYPAIR } from "../utils/serverContractHelpers";
import { AssetService } from "../services/assetService";
import { Asset } from "../entity/Asset";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { LiquidityPool } from "../entity/LiquidityPool";

interface DeployAssetRequest {
  symbol: string;
  name: string;
  feedAddress: string;
  decimals: number;
  minCollateralRatio: number;
  annualInterestRate: number;
}

const findPrebuiltContractsPath = (filename: string) => {
  // Check multiple possible locations for the prebuilt contracts
  const possiblePaths = [
    // Docker path
    path.join(process.cwd(), "prebuilt_contracts", filename),
    // Local development path relative to dist
    path.join(__dirname, "../../prebuilt_contracts", filename),
    // Local development path relative to src
    path.join(process.cwd(), "../prebuilt_contracts", filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found prebuilt contract at: ${p}`);
      return p;
    }
  }

  throw new Error(
    `Pre-built WASM file ${filename} not found. Checked paths: ${possiblePaths.join(", ")}`
  );
};

// Deploy a new asset and update configs
export const deployAsset: RequestHandler = async (req, res) => {
  const assetService = await AssetService.create();
  const liquidityPoolService = await LiquidityPoolService.create();

  try {
    const {
      symbol,
      name,
      decimals,
      minCollateralRatio,
      annualInterestRate,
      feedAddress,
    } = req.body as DeployAssetRequest;
    if (
      !symbol ||
      !name ||
      !decimals ||
      !minCollateralRatio ||
      !annualInterestRate
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if asset already exists
    const existingPool = await liquidityPoolService.findOne(`x${symbol}`);
    if(existingPool) {
      res.status(400).json({ error: `Asset ${symbol} already exists as x${symbol}` });
      return;
    }

    // Determine if we're using testnet or mainnet
    const isTestnet = process.env.NETWORK === "testnet" || !process.env.NETWORK;
    // Use pre-built wasm file instead of building at runtime

    const wasmpath = findPrebuiltContractsPath("xasset_standard.wasm");

    // Check if the prebuilt wasm exists
    if (!fs.existsSync(wasmpath)) {
      throw new Error(`Pre-built WASM file not found at ${wasmpath}`);
    }

    // Deploy contract using Stellar CLI with pre-built standard wasm
    const serverSecretKey = SERVER_KEYPAIR.secret();
    const deployResult = spawnSync(
      "stellar",
      [
        "contract",
        "deploy",
        "--wasm",
        wasmpath,
        "--source-account",
        serverSecretKey,
      ],
      { encoding: "utf8" }
    );

    if (deployResult.error || deployResult.status !== 0) {
      throw new Error(
        `Contract deployment failed: ${deployResult.stderr || deployResult.error}`
      );
    }

    const contractId = deployResult.stdout.trim();

    // Get the native asset ID first
    const xlmSacResult = spawnSync(
      "stellar",
      ["contract", "id", "asset", "--asset", "native"],
      { encoding: "utf8" }
    );

    if (xlmSacResult.error || xlmSacResult.status !== 0) {
      throw new Error(
        `Failed to get native asset ID: ${xlmSacResult.stderr || xlmSacResult.error}`
      );
    }

    // Trim any whitespace or newlines from the output
    const xlmSacId = xlmSacResult.stdout.trim();

    // Set the admin for the contract
    const adminSetResult = spawnSync(
      "stellar",
      [
        "contract",
        "invoke",
        "--id",
        contractId,
        "--source-account",
        serverSecretKey,
        "--",
        "admin_set",
        "--new-admin",
        SERVER_KEYPAIR.publicKey(),
      ],
      { encoding: "utf8" }
    );

    if (adminSetResult.status !== 0) {
      console.error(`Admin set failed: ${adminSetResult.stderr.toString()}`);
      res.status(500).json({ error: "Failed to set contract admin" });
      return;
    }

    // Initialize contract with the obtained native asset ID
    const initResult = spawnSync(
      "stellar",
      [
        "contract",
        "invoke",
        "--id",
        contractId,
        "--source-account",
        serverSecretKey,
        "--",
        "cdp_init",
        "--xlm_sac",
        xlmSacId,
        "--xlm_contract",
        "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
        "--asset_contract",
        feedAddress,
        "--pegged_asset",
        symbol,
        "--min_collat_ratio",
        `${minCollateralRatio * 100}`,
        "--symbol",
        `x${symbol}`,
        "--name",
        name,
        "--decimals",
        `${decimals}`,
        "--annual_interest_rate",
        `${annualInterestRate * 100}`,
      ],
      { encoding: "utf8" }
    );

    if (initResult.error || initResult.status !== 0) {
      throw new Error(
        `Contract initialization failed: ${initResult.stderr || initResult.error}`
      );
    }

    const mercuryWasmPath = findPrebuiltContractsPath("xasset_mercury.wasm");

    // Check if the prebuilt mercury wasm exists
    if (!fs.existsSync(mercuryWasmPath)) {
      throw new Error(
        `Pre-built Mercury WASM file not found at ${mercuryWasmPath}`
      );
    }

    // TODO Add the asset to the assets table
    console.log("Contract ID: ", contractId);
    const { price } = await getLatestPriceData(
      symbol,
      contractId
    );
    const { price: xlmPrice } = await getLatestPriceData(
      "XLM",
      contractId
    );
    // Create Asset
    const existingAsset = await assetService.findOne(`x${symbol}`);
    console.log("Existing asset", existingAsset)
    if (!existingAsset) {
      console.log("Creating asset in database")
      let asset = new Asset();
      asset.symbol = `x${symbol}`;
      asset.feed_address = feedAddress;
      asset.price = price.toString();
      asset.last_xlm_price = xlmPrice.toString();
      asset = await assetService.insert(asset);
      // Create LiquidityPool
      const liquidityPool = new LiquidityPool();
      liquidityPool.asset = asset;
      liquidityPool.pool_address = contractId;
      liquidityPool.minimum_collateralization_ratio = minCollateralRatio * 100;
      await liquidityPoolService.insert(liquidityPool);
    }

    const liquidityPools = await liquidityPoolService.findAll()
    const contractIds = liquidityPools.map((lp) => lp.pool_address);
    console.log("DB contract IDs")
    console.log(contractIds)
    console.log("Includes contract ID: ", contractIds.includes(contractId))
    // Deploy to Mercury with Mercury-enabled build
    const mercuryArgs = [
      "mercury-cli",
      "--jwt",
      process.env.RETROSHADE_API_TOKEN!,
      "--mainnet",
      isTestnet ? "false" : "true",
      "retroshade",
      "--project",
      "equitx",
      ...contractIds.flatMap((id) => ["--contracts", id]),
      "--target",
      mercuryWasmPath,
    ];

    console.log(mercuryArgs[0]);
    console.log(mercuryArgs.slice(1));
    const mercuryResult = spawnSync(mercuryArgs[0], mercuryArgs.slice(1), {
      encoding: "utf8",
    });

    if (mercuryResult.error || mercuryResult.status !== 0) {
      throw new Error(
        `Mercury deployment failed: ${mercuryResult.stderr || mercuryResult.error}`
      );
    }

    console.log(mercuryResult)

    // Extract WASM hash from Mercury output
    const wasmHash = mercuryResult.stdout.match(/wasm hash: ([a-f0-9]+)/)?.[1];
    if (!wasmHash) {
      throw new Error("Could not extract WASM hash from Mercury output");
    }

    res.status(200).json({
      success: true,
      contractId,
      message: `Deployed x${symbol} contract successfully`,
    });
  } catch (error: any) {
    console.error("Error deploying asset:", error);
    res
      .status(500)
      .json({ error: error.message || "An unknown error occurred" });
  }
};
