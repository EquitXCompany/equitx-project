import { useQuery, type UseQueryResult, type UseQueryOptions } from 'react-query';
import { apiClient } from '../../utils/apiClient';

export type ContractState = {
  key: string;
  asset_symbol: string;
  value: string;
  updatedAt: Date;
};

async function fetchContractStates(assetSymbol: string): Promise<ContractState[]> {
  const { data } = await apiClient.get(`/api/singletons/${assetSymbol}`);
  return data.map((state: any) => ({
    ...state,
    updatedAt: new Date(state.updatedAt),
  }));
}

async function fetchContractStateByKey(assetSymbol: string, key: string): Promise<ContractState> {
  const { data } = await apiClient.get(`/api/singletons/${assetSymbol}/${key}`);
  return {
    ...data,
    updatedAt: new Date(data.updatedAt),
  };
}

export function useContractStates(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<ContractState[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<ContractState[], Error> {
  return useQuery<ContractState[], Error>(
    ['contractStates', assetSymbol],
    () => fetchContractStates(assetSymbol),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}

export function useContractStateByKey(
  assetSymbol: string,
  key: string,
  options?: Omit<UseQueryOptions<ContractState, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<ContractState, Error> {
  return useQuery<ContractState, Error>(
    ['contractState', assetSymbol, key],
    () => fetchContractStateByKey(assetSymbol, key),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options
    }
  );
}