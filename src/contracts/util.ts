export const rpcUrl =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const networkPassphrase =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";

import { contractMapping, XAssetSymbol } from './contractConfig';
import { type Client, Errors } from 'xBTC'; 
export type XAssetContract = Client;
export const ContractErrors = Errors;

// Dynamic imports for all xAsset clients
const getClient = async (symbol: XAssetSymbol): Promise<XAssetContract> => {
  const module = await import(/* @vite-ignore */ `./${symbol}`);
  return module.default;
};

// Get contract instance by symbol
export const getContractBySymbol = async (symbol: XAssetSymbol): Promise<XAssetContract> => {
  const clientModule = await getClient(symbol);
  return clientModule;
};

// Preload all contracts
export const preloadContracts = async () => {
  const contracts: Record<XAssetSymbol, XAssetContract> = {} as Record<XAssetSymbol, XAssetContract>;
  
  for (const [symbol, _contractId] of Object.entries(contractMapping)) {
    const clientModule = await getClient(symbol as XAssetSymbol);
    contracts[symbol as XAssetSymbol] = clientModule;
  }
  
  return contracts;
};
