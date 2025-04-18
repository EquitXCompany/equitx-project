import axios from "axios";
import { apiClient } from "./apiClient";
import { getAddress, signMessage } from "@stellar/freighter-api";
import { useQueryClient } from "react-query";

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
  wasmHash: string;
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
  const queryClient = useQueryClient();
  try {
    const authHeader = await getAuthorizationHeader();

    const response = await apiClient.post<DeployAssetResponse>(
      "/api/admin/deploy",
      params,
      {
        headers: {
          Authorization: authHeader,
        },
        timeout: 120000,
      }
    );

    // Invalidate the contract mapping query to refresh the list of assets
    queryClient.invalidateQueries("contractMapping");

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || "Failed to deploy asset");
    }
    throw error;
  }
};
