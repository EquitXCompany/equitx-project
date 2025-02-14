import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
  useQueries,
  QueriesResults,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import { TVLMetricsData, TimestampRange } from "./types";
import BigNumber from "bignumber.js";
import { contractMapping } from "../../contracts/contractConfig";

function transformTVLMetrics(data: any): TVLMetricsData {
  return {
    asset: data.asset,
    totalXlmLocked: new BigNumber(data.totalXlmLocked),
    totalXassetsMinted: new BigNumber(data.totalXassetsMinted),
    totalXassetsStaked: new BigNumber(data.totalXassetsStaked),
    activeCDPsCount: Number(data.activeCDPsCount),
    tvlUSD: new BigNumber(data.tvlUSD),
    totalXassetsMintedUSD: new BigNumber(data.totalXassetsMintedUSD),
    totalXassetsStakedUSD: new BigNumber(data.totalXassetsStakedUSD),
    openAccounts: Number(data.openAccounts),
    stakedShareHistogram: {
      bucketSize: Number(data.stakedShareHistogram.bucketSize),
      min: Number(data.stakedShareHistogram.min),
      max: Number(data.stakedShareHistogram.max),
      buckets: data.stakedShareHistogram.buckets.map(
        (b: string) => new BigNumber(b)
      ),
    },
    timestamp: new Date(data.timestamp),
  };
}

async function fetchLatestTVLByAsset(
  assetSymbol: string
): Promise<TVLMetricsData> {
  const { data } = await apiClient.get(`/api/tvl/${assetSymbol}/latest`);
  return transformTVLMetrics(data);
}

async function fetchTVLHistoryByAsset(
  assetSymbol: string,
  timeRange?: TimestampRange
): Promise<TVLMetricsData[]> {
  const params = new URLSearchParams();
  if (timeRange?.start_time) params.append("start_time", timeRange.start_time);
  if (timeRange?.end_time) params.append("end_time", timeRange.end_time);

  const { data } = await apiClient.get(
    `/api/tvl-metrics/${assetSymbol}/history?${params.toString()}`
  );
  return data.map(transformTVLMetrics);
}

export function useLatestTVLMetrics(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<TVLMetricsData, Error>, "queryKey" | "queryFn">
): UseQueryResult<TVLMetricsData, Error> {
  return useQuery<TVLMetricsData, Error>(
    ["tvl-metrics", assetSymbol, "latest"],
    () => fetchLatestTVLByAsset(assetSymbol),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useLatestTVLMetricsForAllAssets() {
  return useQueries(
    Object.keys(contractMapping).map((assetSymbol) => ({
      queryKey: ["tvl-metrics", assetSymbol, "latest"],
      queryFn: async () => {
        const result = await fetchLatestTVLByAsset(assetSymbol);
        return result as TVLMetricsData;
      },
    }))
  );
}

export function useTVLMetricsHistory(
  assetSymbol: string,
  timeRange?: TimestampRange,
  options?: Omit<
    UseQueryOptions<TVLMetricsData[], Error>,
    "queryKey" | "queryFn"
  >
): UseQueryResult<TVLMetricsData[], Error> {
  return useQuery<TVLMetricsData[], Error>(
    ["tvl-metrics", assetSymbol, "history", timeRange],
    () => fetchTVLHistoryByAsset(assetSymbol, timeRange),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}
