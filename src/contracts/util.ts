export const rpcUrl =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const networkPassphrase =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";

import { Client, Errors } from "xBTC";
export type XAssetContract = Client;
export const ContractErrors = Errors;

// Get contract client instance by symbol
export const getContractBySymbol = (symbol: string, contractMapping: Record<string, string>): XAssetContract => {
  const contractAddress = contractMapping[symbol];
  if (!contractAddress) {
    throw new Error(`Contract not found for symbol: ${symbol}`);
  }

  return new Client({
    networkPassphrase,
    contractId: contractAddress,
    rpcUrl,
    publicKey: undefined,
  })
};

export const getContractAddress = (symbol: string, contractMapping: Record<string,string>): string => {
  const contractAddress = contractMapping[symbol];
  if (!contractAddress) {
    throw new Error(`Contract not found for symbol: ${symbol}`);
  }
  return contractAddress;
}