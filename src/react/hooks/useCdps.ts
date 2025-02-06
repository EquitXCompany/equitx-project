import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import BigNumber from "bignumber.js";
import { unwrapResult } from "../../utils/contractHelpers";
import { i128, u32 } from "@stellar/stellar-sdk/contract";
import { useXAssetContract } from "./useXAssetContract";
import { XAssetSymbol } from "../../contracts/contractConfig";

export type ContractCDPStatus =
  | { tag: "Open"; values: void }
  | { tag: "Insolvent"; values: void }
  | { tag: "Frozen"; values: void }
  | { tag: "Closed"; values: void };

export interface ContractCDP {
  asset_lent: i128;
  collateralization_ratio: u32;
  lender: string;
  status: ContractCDPStatus;
  xlm_deposited: i128;
}

export type CDP = {
  lender: string;
  contract_id: string;
  xlm_deposited: BigNumber;
  asset_lent: BigNumber;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function CalculateCollateralizationRatio(
  cdp: CDP,
  xlm_price: BigNumber,
  xasset_price: BigNumber
): BigNumber {
  if (cdp.asset_lent.isEqualTo(0) || xasset_price.isEqualTo(0)) {
    return new BigNumber(Infinity);
  }
  return cdp.xlm_deposited
    .times(xlm_price)
    .div(cdp.asset_lent.times(xasset_price));
}

async function fetchCdps(): Promise<CDP[]> {
  const { data } = await apiClient.get("/api/cdps");
  return data.map((cdp: any) => ({
    ...cdp,
    xlm_deposited: new BigNumber(cdp.xlm_deposited),
    asset_lent: new BigNumber(cdp.asset_lent),
    createdAt: new Date(cdp.createdAt),
    updatedAt: new Date(cdp.updatedAt),
  }));
}

// src/react/hooks/useCdps.ts

async function fetchCdpsByAssetSymbol(assetSymbol: string): Promise<CDP[]> {
  const { data } = await apiClient.get(`/api/cdps/${assetSymbol}`);
  return data.map((cdp: any) => ({
    ...cdp,
    xlm_deposited: new BigNumber(cdp.xlm_deposited),
    asset_lent: new BigNumber(cdp.asset_lent),
    createdAt: new Date(cdp.createdAt),
    updatedAt: new Date(cdp.updatedAt),
  }));
}

async function fetchCdpByAssetAndAddress(
  assetSymbol: string,
  address: string
): Promise<CDP> {
  const { data } = await apiClient.get(`/api/cdps/${assetSymbol}/lender/${address}`);
  return {
    ...data,
    xlm_deposited: new BigNumber(data.xlm_deposited),
    asset_lent: new BigNumber(data.asset_lent),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export function useCdps(
  options?: Omit<UseQueryOptions<CDP[], Error>, "queryKey" | "queryFn">
): UseQueryResult<CDP[], Error> {
  return useQuery<CDP[], Error>(["cdps"], fetchCdps, {
    refetchInterval: 300000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

export function useCdpsByAssetSymbol(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<CDP[], Error>, "queryKey" | "queryFn">
): UseQueryResult<CDP[], Error> {
  return useQuery<CDP[], Error>(
    ["cdps-by-asset-symbol", assetSymbol],
    () => fetchCdpsByAssetSymbol(assetSymbol),
    {
      enabled: !!assetSymbol, // Prevents the query from running if assetSymbol is not provided
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useCdpByAssetAndAddress(
  assetSymbol: string,
  address: string,
  options?: Omit<UseQueryOptions<CDP, Error>, "queryKey" | "queryFn">
): UseQueryResult<CDP, Error> {
  return useQuery<CDP, Error>(
    ["cdp", assetSymbol, address],
    () => fetchCdpByAssetAndAddress(assetSymbol, address),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useContractCdp(
  assetSymbol: XAssetSymbol,
  lender: string,
  options?: Omit<UseQueryOptions<ContractCDP, Error>, "queryKey" | "queryFn">
): UseQueryResult<ContractCDP, Error> {
  const { contract, loading } = useXAssetContract(assetSymbol);

  return useQuery<ContractCDP, Error>(
    ["contract-cdp", assetSymbol, lender],
    async () => {
      if (loading || !contract) {
        throw new Error("Contract is not available");
      }

      const tx = await contract.cdp({ lender });
      return unwrapResult(tx.result, "Failed to retrieve CDP from contract");
    },
    {
      enabled: !loading, // Ensures the query only runs when contract is loaded
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useAllContractCdps(
  assetSymbol: XAssetSymbol,
  lenders: string[],
  options?: Omit<
    UseQueryOptions<Record<string, ContractCDP>, Error>,
    "queryKey" | "queryFn"
  >
): UseQueryResult<Record<string, ContractCDP>, Error> {
  const { contract, loading } = useXAssetContract(assetSymbol);

  return useQuery<Record<string, ContractCDP>, Error>(
    ["contract-cdps", assetSymbol, lenders],
    async () => {
      if (loading || !contract) {
        throw new Error("Contract is not available");
      }

      const cdpPromises = lenders.map(async (lender) => {
        try {
          const tx = await contract.cdp({ lender });
          const cdp = unwrapResult(
            tx.result,
            "Failed to retrieve CDP from contract"
          );
          return [lender, cdp];
        } catch (error) {
          console.error(`Failed to fetch CDP for ${lender}:`, error);
          return [lender, null];
        }
      });

      const cdps = await Promise.all(cdpPromises);
      return Object.fromEntries(cdps.filter(([_, cdp]) => cdp !== null));
    },
    {
      enabled: lenders.length > 0 && !loading, // Ensures the query only runs when contract is loaded
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}
