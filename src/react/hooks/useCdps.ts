import { useQuery, type UseQueryResult, type UseQueryOptions } from 'react-query';
import { apiClient } from '../../utils/apiClient';
import BigNumber from 'bignumber.js';
import xasset from '../../contracts/xasset';
import { unwrapResult } from '../../utils/contractHelpers';
import type { CDP as ContractCDP } from 'xasset';

export type CDP = {
  lender: string;
  contract_id: string;
  xlm_deposited: BigNumber;
  asset_lent: BigNumber;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function CalculateCollateralizationRatio(cdp: CDP, xlm_price: BigNumber, xasset_price: BigNumber): BigNumber {
  if (cdp.asset_lent.isEqualTo(0) || xasset_price.isEqualTo(0)) {
    return new BigNumber(Infinity);
  }
  return cdp.xlm_deposited.times(xlm_price).div(cdp.asset_lent.times(xasset_price));
}

async function fetchCdps(): Promise<CDP[]> {
  const { data } = await apiClient.get('/api/cdps');
  return data.map((cdp: any) => ({
    ...cdp,
    xlm_deposited: new BigNumber(cdp.xlm_deposited),
    asset_lent: new BigNumber(cdp.asset_lent),
    createdAt: new Date(cdp.createdAt),
    updatedAt: new Date(cdp.updatedAt),
  }));
}

async function fetchCdpByAssetAndAddress(assetSymbol: string, address: string): Promise<CDP> {
  const { data } = await apiClient.get(`/api/cdp/${assetSymbol}/${address}`);
  return {
    ...data,
    xlm_deposited: new BigNumber(data.xlm_deposited),
    asset_lent: new BigNumber(data.asset_lent),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export function useCdps(
  options?: Omit<UseQueryOptions<CDP[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<CDP[], Error> {
  return useQuery<CDP[], Error>(['cdps'], fetchCdps, {
    refetchInterval: 300000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

export function useCdpByAssetAndAddress(
  assetSymbol: string,
  address: string,
  options?: Omit<UseQueryOptions<CDP, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<CDP, Error> {
  return useQuery<CDP, Error>(
    ['cdp', assetSymbol, address],
    () => fetchCdpByAssetAndAddress(assetSymbol, address),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}

export function useContractCdp(
  lender: string,
  options?: Omit<UseQueryOptions<ContractCDP, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<ContractCDP, Error> {
  return useQuery<ContractCDP, Error>(
    ['contract-cdp', lender],
    async () => {
      console.log(lender)
      const tx = await xasset.cdp({ lender });
      return unwrapResult(tx.result, "Failed to retrieve CDP from contract");
    },
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}

export function useAllContractCdps(
  lenders: string[],
  options?: Omit<UseQueryOptions<Record<string, ContractCDP>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Record<string, ContractCDP>, Error> {
  return useQuery<Record<string, ContractCDP>, Error>(
    ['contract-cdps', lenders],
    async () => {
      const cdpPromises = lenders.map(async (lender) => {
        try {
          const tx = await xasset.cdp({ lender });
          const cdp = unwrapResult(tx.result, "Failed to retrieve CDP from contract");
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
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: lenders.length > 0,
      ...options
    }
  );
}