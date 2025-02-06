export const rpcUrl =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const networkPassphrase =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";

import { contractMapping, XAssetSymbol } from './contractConfig';

// Dynamic imports for all xAsset clients
const getClient = async (symbol: XAssetSymbol) => {
  const module = await import(/* @vite-ignore */ `./${symbol}`);
  return module.default;
};

// Get contract instance by symbol
export const getContractBySymbol = async (symbol: XAssetSymbol) => {
  const clientModule = await getClient(symbol);
  return clientModule;
};

// Preload all contracts
export const preloadContracts = async () => {
  const contracts: Record<XAssetSymbol, any> = {} as Record<XAssetSymbol, any>;
  
  for (const [symbol, _contractId] of Object.entries(contractMapping)) {
    const clientModule = await getClient(symbol as XAssetSymbol);
    contracts[symbol as XAssetSymbol] = clientModule;
  }
  
  return contracts;
};
