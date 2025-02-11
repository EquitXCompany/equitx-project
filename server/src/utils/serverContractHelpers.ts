import { Keypair, TransactionBuilder, Operation, Networks } from "stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import BigNumber from "bignumber.js";
import { assetConfig } from "../config/AssetConfig";

// Reverse mapping from pool address to asset symbol
const poolAddressToSymbol: Record<string, string> = Object.entries(assetConfig)
  .reduce((accumulator, [symbol, details]) => {
    accumulator[details.pool_address] = symbol;
    return accumulator;
  }, {} as Record<string, string>);

const serverSecretKey = process.env.SERVER_SECRET_KEY;

if (!serverSecretKey) {
  throw new Error("SERVER_SECRET_KEY environment variable is not set");
}

function mnemonicToSeed(mnemonic: string): Buffer {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivationPath = "m/44'/148'/0'";
  const { key } = derivePath(derivationPath, seed.toString("hex"));
  return Buffer.from(key);
}

const seedBuffer = mnemonicToSeed(serverSecretKey);
const keypair = Keypair.fromRawEd25519Seed(seedBuffer);
const publicKey = keypair.publicKey();

interface XAssetClient {
  freeze_cdp: (params: any) => Promise<any>;
  liquidate_cdp: (params: any) => Promise<any>;
  lastprice_xlm: () => Promise<any>; 
  lastprice_asset: () => Promise<any>;
  minimum_collateralization_ratio: () => Promise<any>;
  get_total_xasset: () => Promise<any>;
  get_total_collateral: () => Promise<any>;
}

interface DataFeedClient {
  lastprice: (params: any) => Promise<any>;
}

async function getClientByPoolAddress(poolAddress: string): Promise<XAssetClient | DataFeedClient> {
  const symbol = poolAddressToSymbol[poolAddress];

  if (!symbol) {
    throw new Error(`No symbol found for pool address: ${poolAddress}`);
  }

  const module = await import(/* @vite-ignore */ symbol);
  return new module.Client(
    {
      networkPassphrase:
        process.env.SERVER_NETWORK_PASSPHRASE ??
        "Test SDF Network ; September 2015",
      contractId: poolAddress,
      rpcUrl:
        process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
      publicKey,
    });
}

async function getClient(
  contractId: string,
  clientType: "xasset" | "datafeed"
): Promise<XAssetClient | DataFeedClient> {
  if (clientType === "xasset") {
    return await getClientByPoolAddress(contractId);
  } else {
    const Client = await import("data_feed");
    return new Client.Client({
      networkPassphrase:
        process.env.SERVER_NETWORK_PASSPHRASE ??
        "Test SDF Network ; September 2015",
      contractId,
      rpcUrl:
        process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
      publicKey,
    }) as DataFeedClient;
  }
}

export async function serverAuthenticatedContractCall(
  contractMethod: string,
  params: any,
  contractId: string,
  clientType: "xasset" | "datafeed" = "xasset"
) {
  let tx;
  const client = await getClient(contractId, clientType);

  let needsSign = true;
  // Type guard to check client type
  if (clientType === "xasset") {
    const xassetClient = client as XAssetClient;
    switch (contractMethod) {
      case "freeze_cdp":
        tx = await xassetClient.freeze_cdp(params);
        break;
      case "liquidate_cdp":
        tx = await xassetClient.liquidate_cdp(params);
        break;
      case "lastprice_xlm":
        needsSign = false;
        tx = await xassetClient.lastprice_xlm();
        break;
      case "lastprice_asset":
        needsSign = false;
        tx = await xassetClient.lastprice_asset();
        break;
      case "minimum_collateralization_ratio":
        needsSign = false;
        tx = await xassetClient.minimum_collateralization_ratio();
        break;
      case "get_total_xasset":
        needsSign = false;
        tx = await xassetClient.get_total_xasset();
        break;
      case "get_total_collateral":
        needsSign = false;
        tx = await xassetClient.get_total_collateral();
        break;
      default:
        throw new Error(`Unsupported xasset method: ${contractMethod}`);
    }
  }
  else {
    const datafeedClient = client as DataFeedClient;
    switch (contractMethod) {
      case "lastprice":
        needsSign = false;
        tx = await datafeedClient.lastprice(params);
        break;
      default:
        throw new Error(`Unsupported datafeed method: ${contractMethod}`);
    }
  }

  const signer = basicNodeSigner(
    keypair,
    process.env.STELLAR_NETWORK_PASSPHRASE ?? ""
  );

  try {
    if (needsSign) {
      let txResult = await tx.signAndSend({
        signTransaction: signer.signTransaction,
      });
      return {
        status: txResult.result.isOk() ? "SUCCESS" : "FAILED",
        result: txResult.result,
      };
    }
    else{
      return {
        status: typeof tx.result.isOk === 'function' ? tx.result.isOk() ? "SUCCESS" : "FAILED" : "SUCCESS",
        result: tx.result,
      }
    }
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
}

export async function getLatestPriceData(
  assetSymbol: string,
  feedAddress: string
) {
  try {
    let method = "lastprice_asset";
    if(assetSymbol === "XLM") method = "lastprice_xlm";
    const priceData = await serverAuthenticatedContractCall(
      method,
      null,
      feedAddress,
      "xasset"
    );

    if (!priceData || !priceData.result.isOk()) {
      throw new Error(`No price data found for ${assetSymbol}`);
    }

    const { price, timestamp } = priceData.result.unwrap();
    return {
      price: new BigNumber(price),
      timestamp: new Date(Number(timestamp) * 1000),
    };
  } catch (error) {
    console.error(`Error getting price data for ${assetSymbol}:`, error);
    throw error;
  }
}

export async function getMinimumCollateralizationRatio(contractId: string) {
  try {
    const ratioData = await serverAuthenticatedContractCall(
      "minimum_collateralization_ratio",
      null,
      contractId,
      "xasset"
    );

    if (!ratioData){
      throw new Error("Could not get minimum collateralization ratio");
    }
    return Number(ratioData.result);
  } catch (error) {
    console.error("Error getting minimum collateralization ratio:", error);
    throw error;
  }
}

export async function getTotalXAsset(contractId: string) {
  try {
    const totalXAssetData = await serverAuthenticatedContractCall(
      "get_total_xasset",
      null,
      contractId,
      "xasset"
    );

    if (!totalXAssetData || !totalXAssetData.result) {
      throw new Error("Could not get total xAsset");
    }
    return new BigNumber(totalXAssetData.result.toString());
  } catch (error) {
    console.error("Error getting total xAsset:", error);
    throw error;
  }
}

export async function getTotalCollateral(contractId: string) {
  try {
    const totalCollateralData = await serverAuthenticatedContractCall(
      "get_total_collateral",
      null,
      contractId,
      "xasset"
    );

    if (!totalCollateralData || !totalCollateralData.result) {
      throw new Error("Could not get total collateral");
    }
    return new BigNumber(totalCollateralData.result.toString());
  } catch (error) {
    console.error("Error getting total collateral:", error);
    throw error;
  }
}