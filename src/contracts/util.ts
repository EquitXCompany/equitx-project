export const rpcUrl =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const networkPassphrase =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";

import { contractMapping, XAssetSymbol } from "./contractConfig";
import { Client, Errors } from "xBTC";
export type XAssetContract = Client;
export const ContractErrors = Errors;

const contractClientMap = {
  xBTC: new Client({
    networkPassphrase,
    contractId: contractMapping.xBTC,
    rpcUrl,
    publicKey: undefined,
  }),
  xETH: new Client({
    networkPassphrase,
    contractId: contractMapping.xETH,
    rpcUrl,
    publicKey: undefined,
  }),
  xUSDT: new Client({
    networkPassphrase,
    contractId: contractMapping.xUSDT,
    rpcUrl,
    publicKey: undefined,
  }),
  xXRP: new Client({
    networkPassphrase,
    contractId: contractMapping.xXRP,
    rpcUrl,
    publicKey: undefined,
  }),
  xSOL: new Client({
    networkPassphrase,
    contractId: contractMapping.xSOL,
    rpcUrl,
    publicKey: undefined,
  }),
  xADA: new Client({
    networkPassphrase,
    contractId: contractMapping.xADA,
    rpcUrl,
    publicKey: undefined,
  }),

  xAQUA: new Client({
    networkPassphrase,
    contractId: contractMapping.xAQUA,
    rpcUrl,
    publicKey: undefined,
  }),} as const;

// Get contract instance by symbol
export const getContractBySymbol = (symbol: XAssetSymbol): XAssetContract => {
  return contractClientMap[symbol];
};

// Preload all contracts
export const preloadContracts = () => {
  const contracts: Record<XAssetSymbol, XAssetContract> = {} as Record<
    XAssetSymbol,
    XAssetContract
  >;

  for (const [symbol, _contractId] of Object.entries(contractMapping)) {
    const clientModule = getContractBySymbol(symbol as XAssetSymbol);
    contracts[symbol as XAssetSymbol] = clientModule;
  }

  return contracts;
};
