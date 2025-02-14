import { useQuery, type UseQueryResult, type UseQueryOptions } from 'react-query';
import { apiClient } from '../../utils/apiClient';
import BigNumber from 'bignumber.js';
import { Asset } from './useAssets';

export type Staker = {
  address: string;
  asset: Asset;
  xasset_deposit: BigNumber;
  updatedAt: Date;
};

async function fetchStakers(): Promise<Staker[]> {
  const { data } = await apiClient.get('/api/stakers');
  return data.map((staker: any) => ({
    ...staker,
    xasset_deposit: new BigNumber(staker.xasset_deposit),
    updatedAt: new Date(staker.updatedAt),
  }));
}

async function fetchStakerByAssetAndAddress(assetSymbol: string, address: string): Promise<Staker> {
  const { data } = await apiClient.get(`/api/stakers/asset/${assetSymbol}/address/${address}`);
  return {
    ...data,
    xasset_deposit: new BigNumber(data.xasset_deposit),
    updatedAt: new Date(data.updatedAt),
  };
}

export function useStakers(
  options?: Omit<UseQueryOptions<Staker[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Staker[], Error> {
  return useQuery<Staker[], Error>(['stakers'], fetchStakers, {
    refetchInterval: 300000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

export function useStakerByAssetAndAddress(
  assetSymbol: string,
  address: string,
  options?: Omit<UseQueryOptions<Staker, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Staker, Error> {
  return useQuery<Staker, Error>(
    ['staker', assetSymbol, address],
    () => fetchStakerByAssetAndAddress(assetSymbol, address),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}

export function useStakersByAddress(
  address: string,
  options?: Omit<UseQueryOptions<Staker[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Staker[], Error> {
  return useQuery<Staker[], Error>(
    ['stakers', 'address', address],
    async () => {
      const { data } = await apiClient.get(`/api/stakers/address/${address}`);
      return data.map((staker: any) => ({
        ...staker,
        xasset_deposit: new BigNumber(staker.xasset_deposit),
        updatedAt: new Date(staker.updatedAt),
      }));
    },
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}