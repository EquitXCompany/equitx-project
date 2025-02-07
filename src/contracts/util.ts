export const rpcUrl =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const networkPassphrase =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";

import { contractMapping, XAssetSymbol } from "./contractConfig";
import { Client, Errors } from "xBTC";
export type XAssetContract = typeof Client;
export const ContractErrors = Errors;

const contractClientMap = {
  xBTC: new Client({
    networkPassphrase,
    contractId: "CDUE2LN7VSAIVHD3T72OSYPS77DEUOU5OBRXWRZVKAPALT2IKKOZKY7X",
    rpcUrl,
    publicKey: undefined,
  }),
  xETH: new Client({
    networkPassphrase,
    contractId: "CCADQ6RUME6G4NVBTGGVPDQSMWV3ZQNAVI64ZP34MJBUYOT5SZFDJK3T",
    rpcUrl,
    publicKey: undefined,
  }),
  xUSDT: new Client({
    networkPassphrase,
    contractId: "CAJ3TA3DSFCRI7USITE3PB5E2OQUXCND7IYGILW73IV663JORXS7IKQV",
    rpcUrl,
    publicKey: undefined,
  }),
  xXRP: new Client({
    networkPassphrase,
    contractId: "CDIWDE5BGTI5TWACCZT2FCCOOQC3ND7ARJCHNZKSDZ2A2ZCLYYRJ2MF7",
    rpcUrl,
    publicKey: undefined,
  }),
  xSOL: new Client({
    networkPassphrase,
    contractId: "CDGJZ4PNXNE4EZ4LB4EPAQB55KNQI5QZC4M4POVAAMLLIVYUX5T56DHS",
    rpcUrl,
    publicKey: undefined,
  }),
} as const;

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
