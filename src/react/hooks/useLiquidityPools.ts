import { useQuery, type UseQueryResult, type UseQueryOptions } from 'react-query';
import { apiClient } from '../../utils/apiClient';
import BigNumber from 'bignumber.js';

export type LiquidityPool = {
  asset_symbol: string;
  total_liquidity: BigNumber;
  available_liquidity: BigNumber;
  utilization_rate: BigNumber;
  apy: BigNumber;
  contract_id: string;
  updatedAt: Date;
};

async function fetchLiquidityPools(): Promise<LiquidityPool[]> {
  const { data } = await apiClient.get('/api/liquidity-pools');
  return data.map((pool: any) => ({
    ...pool,
    total_liquidity: new BigNumber(pool.total_liquidity),
    available_liquidity: new BigNumber(pool.available_liquidity),
    utilization_rate: new BigNumber(pool.utilization_rate),
    apy: new BigNumber(pool.apy),
    updatedAt: new Date(pool.updatedAt),
  }));
}

async function fetchLiquidityPoolByAsset(assetSymbol: string): Promise<LiquidityPool> {
  const { data } = await apiClient.get(`/api/liquidity-pools/${assetSymbol}`);
  return {
    ...data,
    total_liquidity: new BigNumber(data.total_liquidity),
    available_liquidity: new BigNumber(data.available_liquidity),
    utilization_rate: new BigNumber(data.utilization_rate),
    apy: new BigNumber(data.apy),
    updatedAt: new Date(data.updatedAt),
  };
}

export function useLiquidityPools(
  options?: Omit<UseQueryOptions<LiquidityPool[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<LiquidityPool[], Error> {
  return useQuery<LiquidityPool[], Error>(['liquidityPools'], fetchLiquidityPools, {
    refetchInterval: 300000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

export function useLiquidityPoolByAsset(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<LiquidityPool, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<LiquidityPool, Error> {
  return useQuery<LiquidityPool, Error>(
    ['liquidityPool', assetSymbol],
    () => fetchLiquidityPoolByAsset(assetSymbol),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}
