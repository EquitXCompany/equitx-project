import { useQuery, type UseQueryResult, type UseQueryOptions } from 'react-query';
import { apiClient } from '../../utils/apiClient';
import BigNumber from 'bignumber.js';

export type Asset = {
  symbol: string;
  name: string;
  total_supply: BigNumber;
  price: BigNumber;
  contract_id: string;
};

async function fetchAssets(): Promise<Asset[]> {
  const { data } = await apiClient.get('/api/assets');
  return data.map((asset: any) => ({
    ...asset,
    total_supply: new BigNumber(asset.total_supply),
    price: new BigNumber(asset.price),
  }));
}

async function fetchAssetBySymbol(symbol: string): Promise<Asset> {
  const { data } = await apiClient.get(`/api/assets/${symbol}`);
  return {
    ...data,
    total_supply: new BigNumber(data.total_supply), 
    price: new BigNumber(data.price),
  };
}

export function useAssets(
  options?: Omit<UseQueryOptions<Asset[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Asset[], Error> {
  return useQuery<Asset[], Error>(['assets'], fetchAssets, {
    refetchInterval: 300000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

export function useAssetBySymbol(
  symbol: string,
  options?: Omit<UseQueryOptions<Asset, Error>, 'queryKey' | 'queryFn'>  
): UseQueryResult<Asset, Error> {
  return useQuery<Asset, Error>(
    ['asset', symbol],
    () => fetchAssetBySymbol(symbol),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}
