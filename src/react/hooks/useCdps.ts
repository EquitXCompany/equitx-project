import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import BigNumber from "bignumber.js";
import { unwrapResult } from "../../utils/contractHelpers";
import { i128, u32, u64 } from "@stellar/stellar-sdk/contract";
import { useXAssetContract } from "./useXAssetContract";
import { XAssetSymbol } from "../../contracts/contractConfig";
import { Asset, useAssets } from "./useAssets";
import { useMemo } from "react";

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
  accrued_interest: {
    amount: i128;
    paid: i128;
  };
  interest_paid: i128;
  last_interest_time: u64;
}

export type CDP = {
  asset: Asset;
  lender: string;
  contract_id: string;
  xlm_deposited: BigNumber;
  asset_lent: BigNumber;
  accrued_interest: BigNumber;
  interest_paid: BigNumber;
  last_interest_time: string;
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
    accrued_interest: new BigNumber(cdp.accrued_interest),
    interest_paid: new BigNumber(cdp.interest_paid),
    createdAt: new Date(cdp.createdAt),
    updatedAt: new Date(cdp.updatedAt),
  }));
}

async function fetchCdpsByAssetSymbol(assetSymbol: string): Promise<CDP[]> {
  const { data } = await apiClient.get(`/api/cdps/${assetSymbol}`);
  return data.map((cdp: any) => ({
    ...cdp,
    xlm_deposited: new BigNumber(cdp.xlm_deposited),
    asset_lent: new BigNumber(cdp.asset_lent),
    accrued_interest: new BigNumber(cdp.accrued_interest),
    interest_paid: new BigNumber(cdp.interest_paid),
    createdAt: new Date(cdp.createdAt),
    updatedAt: new Date(cdp.updatedAt),
  }));
}

async function fetchCdpByAssetAndAddress(
  assetSymbol: string,
  address: string
): Promise<CDP> {
  const { data } = await apiClient.get(
    `/api/cdps/${assetSymbol}/lender/${address}`
  );
  return {
    ...data,
    xlm_deposited: new BigNumber(data.xlm_deposited),
    asset_lent: new BigNumber(data.asset_lent),
    accrued_interest: new BigNumber(data.accrued_interest),
    interest_paid: new BigNumber(data.interest_paid),
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

const isCdpNotFoundError = (error: string): boolean => {
  return error.includes("Error(Contract, #3)");
};

const retryPolicy = (failureCount: number, error: Error): boolean => {
  if (isCdpNotFoundError(error.message)) {
    return false;
  }
  return failureCount < 3;
};

const retryDelay = (attemptIndex: number): number => 
  Math.min(1000 * 2 ** attemptIndex, 30000);

const commonQueryOptions = {
  refetchInterval: 300000,
  retry: retryPolicy,
  retryDelay,
};

export function useContractCdp(
  assetSymbol: XAssetSymbol,
  lender: string,
  options?: Omit<UseQueryOptions<ContractCDP | null, Error>, "queryKey" | "queryFn">
): UseQueryResult<ContractCDP | null, Error> {
  const { contract, loading } = useXAssetContract(assetSymbol);

  return useQuery<ContractCDP | null, Error>(
    ["contract-cdp", assetSymbol, lender],
    async () => {
      if (loading || !contract) {
        throw new Error("Contract is not available");
      }

      try {
        const tx = await contract.cdp({ lender });
        
        if(tx?.simulation?.error){
          if(isCdpNotFoundError(tx.simulation.error)){
            return null;
          }
        }
        return unwrapResult(tx.result, "Failed to retrieve CDP from contract");
      } catch (error) {
        throw error;
      }
    },
    {
      enabled: !loading && !!lender,
      ...commonQueryOptions,
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
          
        
          if(tx?.simulation?.error){
            if(isCdpNotFoundError(tx.simulation.error)){
              return [lender, null];
            }
          }
          
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
      enabled: lenders.length > 0 && !loading,
      ...commonQueryOptions,
      ...options,
    }
  );
}

function convertContractCDPtoClientCDP(
  contractCDP: ContractCDP,
  asset: Asset,
  contractId: string
): Omit<CDP, "createdAt" | "updatedAt"> {
  console.log(contractCDP)
  return {
    asset,
    contract_id: contractId,
    lender: contractCDP.lender,
    xlm_deposited: new BigNumber(contractCDP.xlm_deposited.toString()),
    asset_lent: new BigNumber(contractCDP.asset_lent.toString()),
    accrued_interest: new BigNumber(contractCDP.accrued_interest.amount.toString()),
    interest_paid: new BigNumber(contractCDP.accrued_interest.paid.toString()),
    last_interest_time: contractCDP.last_interest_time.toString(),
    status: contractCDP.status.tag,
  };
}

export function useMergedCdps(
  assetSymbol: XAssetSymbol,
  userAddress?: string,
  options?: Omit<UseQueryOptions<CDP[], Error>, "queryKey" | "queryFn">
) {
  const { data: assets } = useAssets();
  
  const indexedCDPsQuery = useCdpsByAssetSymbol(assetSymbol, {
    ...options,
    staleTime: 300000,
  });

  const contractCDPQuery = useContractCdp(assetSymbol, userAddress ?? "", {
    enabled: !!userAddress,
    staleTime: 30000,
  });

  const mergedCDPs = useMemo(() => {
    if (!indexedCDPsQuery.data) return indexedCDPsQuery.data;

    const indexedCDPs = [...indexedCDPsQuery.data];

    if (contractCDPQuery.data && userAddress) {
      console.log(contractCDPQuery.data)
      const userCDPIndex = indexedCDPs.findIndex(
        (cdp) => cdp.lender === userAddress
      );

      const indexedCDP = userCDPIndex >= 0 ? indexedCDPs[userCDPIndex] : undefined;

      // Find matching asset from assets query or use indexed CDP asset
      const asset = indexedCDP?.asset ?? assets?.find(a => a.symbol === assetSymbol);

      if (!asset) {
        throw new Error(`Could not find asset data for symbol: ${assetSymbol}`);
      }

      try {
        const contractCDP = convertContractCDPtoClientCDP(
          contractCDPQuery.data,
          asset,
          indexedCDP?.contract_id ?? ""
        );

        if (userCDPIndex >= 0) {
          // Update existing CDP
          indexedCDPs[userCDPIndex] = {
            ...indexedCDP!,
            ...contractCDP,
            createdAt: indexedCDP!.createdAt,
            updatedAt: new Date(), // Update timestamp to show fresh contract data
          };
        } else if (contractCDP.asset_lent?.gt(0)) {
          // Add new CDP if it exists on-chain but not yet indexed
          indexedCDPs.unshift({
            ...contractCDP,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CDP);
        }
      } catch (error) {
        console.error('Error merging CDP data:', error);
        // Continue with unmodified indexed data
      }
    }

    return indexedCDPs;
  }, [indexedCDPsQuery.data, contractCDPQuery.data, userAddress]);

  return {
    data: mergedCDPs,
    isLoading: indexedCDPsQuery.isLoading || 
               (!!userAddress && contractCDPQuery.isLoading),
    error: indexedCDPsQuery.error, // Only consider indexed query errors as fatal
    refetch: () => {
      indexedCDPsQuery.refetch();
      if (userAddress) {
        contractCDPQuery.refetch();
      }
    },
  };
}
