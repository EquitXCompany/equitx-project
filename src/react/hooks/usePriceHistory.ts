import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import BigNumber from "bignumber.js";

export type PriceHistory = {
  price: BigNumber;
  timestamp: Date;
};

async function fetchPriceHistory(
  assetSymbol: string,
  startDate: Date,
  endDate: Date,
): Promise<PriceHistory[]> {
  const { data } = await apiClient.get(
    `/api/price-history/${assetSymbol}/${startDate.getTime()}/${endDate.getTime()}`,
  );
  return data.map((item: any) => ({
    price: new BigNumber(item.price),
    timestamp: new Date(item.timestamp),
  }));
}

async function fetchLatestPrice(assetSymbol: string): Promise<PriceHistory> {
  const { data } = await apiClient.get(
    `/api/price-history/latest/${assetSymbol}`,
  );
  return {
    price: new BigNumber(data.price),
    timestamp: new Date(data.timestamp),
  };
}

export function usePriceHistory(
  assetSymbol: string,
  startDate: Date,
  endDate: Date,
  options?: Omit<
    UseQueryOptions<PriceHistory[], Error>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<PriceHistory[], Error> {
  return useQuery<PriceHistory[], Error>(
    ["priceHistory", assetSymbol, startDate, endDate],
    () => fetchPriceHistory(assetSymbol, startDate, endDate),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    },
  );
}

export function useLatestPrice(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<PriceHistory, Error>, "queryKey" | "queryFn">,
): UseQueryResult<PriceHistory, Error> {
  return useQuery<PriceHistory, Error>(
    ["latestPrice", assetSymbol],
    () => fetchLatestPrice(assetSymbol),
    {
      refetchInterval: 60000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    },
  );
}
