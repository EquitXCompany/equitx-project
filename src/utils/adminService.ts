import axios from "axios";
import { apiClient } from "./apiClient";
import { getAddress, signMessage } from "@stellar/freighter-api";
import { useQueryClient } from "react-query";
import Orchestrator from '../contracts/orchestrator';
import { authenticatedContractCall } from "./contractHelpers";

export interface DeployAssetParams {
  symbol: string;
  name: string;
  feedAddress: string;
  decimals: number;
  minCollateralRatio: number;
  annualInterestRate: number;
}

export interface DeployAssetResponse {
  success: boolean;
  contractId: string;
  message: string;
  errors: string[];
}

export interface UpdateConfigParams {
  symbol: string;
  contractId: string;
}

export interface UpdateConfigResponse {
  success: boolean;
  message: string;
}

const getAuthorizationHeader = async () => {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `admin-auth:${timestamp}`;

    console.log(`Original message to sign: ${message}`);
    console.log(
      `Message bytes (hex): ${Buffer.from(message, "utf8").toString("hex")}`
    );

    // Sign the message using Freighter
    const signResult = await signMessage(message);

    console.log(`Sign result:`, signResult);

    if (!signResult.signedMessage) {
      throw new Error("Failed to sign message with Freighter");
    }

    // Use the signature directly from Freighter
    let signature;
    if (typeof signResult.signedMessage === "string") {
      signature = signResult.signedMessage;
    } else {
      signature = Buffer.from(signResult.signedMessage).toString("base64");
    }

    console.log(`Signature (as received): ${signature}`);

    // Get public key from Freighter
    const publicKeyResult = await getAddress();
    console.log(`getAddress result:`, publicKeyResult);
    const publicKey = publicKeyResult.address;

    return `Bearer ${publicKey}:${signature}:${timestamp}`;
  } catch (error) {
    console.error("Error generating authorization header:", error);
    throw new Error(
      "Failed to generate authorization. Please ensure Freighter is connected."
    );
  }
};

export const deployAsset = async (
  params: DeployAssetParams
): Promise<DeployAssetResponse> => {
  try {
    // Get authentication header first as it is a buggy call and avoids deploying a contract
    // and being unable to call the server
    const authHeader = await getAuthorizationHeader();

    // append "x" to the symbol
    const symbol = `x${params.symbol}`;
    const { result } = await authenticatedContractCall(Orchestrator.deploy_asset_contract, {
      symbol,
      name: params.name,
      asset_contract: params.feedAddress,
      pegged_asset: params.symbol,
      decimals: params.decimals,
      min_collat_ratio: params.minCollateralRatio * 100,
      annual_interest_rate: params.annualInterestRate * 100,
    });

    const contractId = result.value;
    if (!contractId) {
      throw new Error("Failed to deploy asset, no contract ID returned");
    }

    // Call the server to update the database
    const response = await apiClient.post<DeployAssetResponse>(
      "/api/admin/deploy",
      {
        contractId,
        symbol: params.symbol,
        feedAddress: params.feedAddress,
        minCollateralRatio: params.minCollateralRatio,
      },
      {
        headers: {
          Authorization: authHeader,
        },
        timeout: 120000,
      }
    );

    return response.data;
  } catch (error) {
    if ((error as Error).message.includes("Transaction simulation failed")) {
      const err = (error as Error).message;
      if (err.includes("Contract, #3")) {
        throw new Error(`x${params.symbol} contract already exists in the orchestrator.`);
      }
      const msg = (error as Error).message.split("\n")[0];
      throw new Error(msg);
    }
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || "Failed to deploy asset");
    }
    throw error;
  }
};

export const useDeployAsset = (params: DeployAssetParams) => {
  const queryClient = useQueryClient();
  return {
    mutate: async () => {
      const response = await deployAsset(params);
      if (response.success) {
        queryClient.invalidateQueries("contractMapping");
      }
      return response;
    },
  };
}
