import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import { UtilizationMetricsData, TimestampRange } from "./types";
import BigNumber from "bignumber.js";

function transformUtilizationMetrics(data: any): UtilizationMetricsData {
  return {
    asset: data.asset,
    dailyActiveUsers: Number(data.dailyActiveUsers),
    dailyTransactions: Number(data.dailyTransactions),
    dailyXlmVolume: new BigNumber(data.dailyXlmVolume),
    dailyXassetVolume: new BigNumber(data.dailyXassetVolume),
    timestamp: new Date(data.timestamp),
  };
}
async function fetchLatestUtilizationByAsset(assetSymbol: string): Promise<UtilizationMetricsData> {
  const { data } = await apiClient.get(`/api/utilization/${assetSymbol}/latest`);
  return transformUtilizationMetrics(data);
}

async function fetchUtilizationHistoryByAsset(
  assetSymbol: string,
  timeRange?: TimestampRange
): Promise<UtilizationMetricsData[]> {
  const params = new URLSearchParams();
  if (timeRange?.start_time) params.append('start_time', timeRange.start_time);
  if (timeRange?.end_time) params.append('end_time', timeRange.end_time);

  const { data } = await apiClient.get(
    `/api/utilization-metrics/${assetSymbol}/history?${params.toString()}`
  );
  return data.map(transformUtilizationMetrics);
}

export function useLatestUtilizationMetrics(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<UtilizationMetricsData, Error>, "queryKey" | "queryFn">
): UseQueryResult<UtilizationMetricsData, Error> {
  return useQuery<UtilizationMetricsData, Error>(
    ["utilization-metrics", assetSymbol, "latest"],
    () => fetchLatestUtilizationByAsset(assetSymbol),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useUtilizationMetricsHistory(
  assetSymbol: string,
  timeRange?: TimestampRange,
  options?: Omit<UseQueryOptions<UtilizationMetricsData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<UtilizationMetricsData[], Error> {
  return useQuery<UtilizationMetricsData[], Error>(
    ["utilization-metrics", assetSymbol, "history", timeRange],
    () => fetchUtilizationHistoryByAsset(assetSymbol, timeRange),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}