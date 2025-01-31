import { useQuery, type UseQueryResult, type UseQueryOptions } from 'react-query';
import { apiClient } from '../../utils/apiClient';
import BigNumber from 'bignumber.js';

export type Staker = {
  address: string;
  asset_symbol: string;
  staked_amount: BigNumber;
  rewards_earned: BigNumber;
  last_claim_timestamp: Date;
  updatedAt: Date;
};

async function fetchStakers(): Promise<Staker[]> {
  const { data } = await apiClient.get('/api/stakers');
  return data.map((staker: any) => ({
    ...staker,
    staked_amount: new BigNumber(staker.staked_amount),
    rewards_earned: new BigNumber(staker.rewards_earned),
    last_claim_timestamp: new Date(staker.last_claim_timestamp),
    updatedAt: new Date(staker.updatedAt),
  }));
}

async function fetchStakerByAssetAndAddress(assetSymbol: string, address: string): Promise<Staker> {
  const { data } = await apiClient.get(`/api/stakers/${assetSymbol}/${address}`);
  return {
    ...data,
    staked_amount: new BigNumber(data.staked_amount),
    rewards_earned: new BigNumber(data.rewards_earned),
    last_claim_timestamp: new Date(data.last_claim_timestamp),
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
