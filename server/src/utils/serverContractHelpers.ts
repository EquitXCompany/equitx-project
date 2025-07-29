import { Keypair } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import BigNumber from "bignumber.js";
import { Client as ContractClient } from '@stellar/stellar-sdk/contract';

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
export const SERVER_KEYPAIR = Keypair.fromRawEd25519Seed(seedBuffer);
const publicKey = SERVER_KEYPAIR.publicKey();

interface XAssetClient {
  freeze_cdp: (params: any) => Promise<any>;
  liquidate_cdp: (params: any) => Promise<any>;
  lastprice_xlm: () => Promise<any>;
  lastprice_asset: () => Promise<any>;
  minimum_collateralization_ratio: () => Promise<any>;
  admin_get: () => Promise<any>;
  get_total_xasset: () => Promise<any>;
  get_interest_rate: () => Promise<any>;
  get_total_collateral: () => Promise<any>;
}

interface DataFeedClient {
  lastprice: (params: any) => Promise<any>;
}

export async function serverAuthenticatedContractCall(
  contractMethod: string,
  params: any,
  contractId: string,
  clientType: "xasset" | "datafeed" = "xasset"
) {
  let tx;
  const client = await ContractClient.from({
    networkPassphrase:
      process.env.SERVER_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015",
    contractId,
    rpcUrl:
      process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
    publicKey,
  });;

  let needsSign = true;
  // Type guard to check client type
  if (clientType === "xasset") {
    const xassetClient = client as unknown as XAssetClient;
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
      case "admin_get":
        needsSign = false;
        tx = await xassetClient.admin_get();
        break;
      case "get_total_xasset":
        needsSign = false;
        tx = await xassetClient.get_total_xasset();
        break;
      case "get_interest_rate":
        needsSign = false;
        tx = await xassetClient.get_interest_rate();
        break;
      case "get_total_collateral":
        needsSign = false;
        tx = await xassetClient.get_total_collateral();
        break;
      default:
        throw new Error(`Unsupported xasset method: ${contractMethod}`);
    }
  } else {
    const datafeedClient = client as unknown as DataFeedClient;
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
    SERVER_KEYPAIR,
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
    } else {
      return {
        status:
          typeof tx.result.isOk === "function"
            ? tx.result.isOk()
              ? "SUCCESS"
              : "FAILED"
            : "SUCCESS",
        result: tx.result,
      };
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
    if (assetSymbol === "XLM") method = "lastprice_xlm";
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

    if (!ratioData) {
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
    console.log(totalXAssetData);

    if (!totalXAssetData || totalXAssetData.result === undefined) {
      throw new Error("Could not get total xAsset");
    }
    return new BigNumber(totalXAssetData.result);
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

export async function getAdminAddress(contractId: string): Promise<string> {
  try {
    const adminData = await serverAuthenticatedContractCall(
      "admin_get",
      null,
      contractId,
      "xasset"
    );

    if (!adminData || !adminData.result) {
      throw new Error("Could not get admin address");
    }

    return adminData.result.toString();
  } catch (error) {
    console.error("Error getting admin address:", error);
    throw error;
  }
}
