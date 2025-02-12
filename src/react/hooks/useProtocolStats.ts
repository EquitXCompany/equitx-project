import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import { ProtocolStatsData, TimestampRange } from "./types";
import BigNumber from "bignumber.js";

function transformProtocolStats(data: any): ProtocolStatsData {
  return {
    timestamp: new Date(data.timestamp),
    globalMetrics: {
      totalValueLocked: new BigNumber(data.globalMetrics.totalValueLocked),
      totalDebt: new BigNumber(data.globalMetrics.totalDebt),
      uniqueUsers: Number(data.globalMetrics.uniqueUsers),
      activeCDPs: Number(data.globalMetrics.activeCDPs),
      totalStaked: new BigNumber(data.globalMetrics.totalStaked),
    },
    riskMetrics: {
      systemCollateralization: new BigNumber(data.riskMetrics.systemCollateralization),
      liquidationEvents24h: Number(data.riskMetrics.liquidationEvents24h),
      averageHealthFactor: new BigNumber(data.riskMetrics.averageHealthFactor),
    },
    volumeMetrics: {
      dailyVolume: new BigNumber(data.volumeMetrics.dailyVolume),
    },
    growthMetrics: {
      userGrowth24h: Number(data.growthMetrics.userGrowth24h),
      tvlGrowth24h: Number(data.growthMetrics.tvlGrowth24h),
      volumeGrowth24h: Number(data.growthMetrics.volumeGrowth24h),
    }
  };
}

async function fetchLatestStats(): Promise<ProtocolStatsData> {
  const { data } = await apiClient.get("/api/protocol-stats/latest");
  return transformProtocolStats(data);
}

async function fetchStatsHistory(timeRange?: TimestampRange): Promise<ProtocolStatsData[]> {
  const params = new URLSearchParams();
  if (timeRange?.start_time) params.append('start_time', timeRange.start_time);
  if (timeRange?.end_time) params.append('end_time', timeRange.end_time);

  const { data } = await apiClient.get(`/api/protocol-stats/history?${params.toString()}`);
  return data.map(transformProtocolStats);
}

export function useLatestProtocolStats(
  options?: Omit<UseQueryOptions<ProtocolStatsData, Error>, "queryKey" | "queryFn">
): UseQueryResult<ProtocolStatsData, Error> {
  return useQuery<ProtocolStatsData, Error>(
    ["protocol-stats", "latest"],
    fetchLatestStats,
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useProtocolStatsHistory(
  timeRange?: TimestampRange,
  options?: Omit<UseQueryOptions<ProtocolStatsData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<ProtocolStatsData[], Error> {
  return useQuery<ProtocolStatsData[], Error>(
    ["protocol-stats", "history", timeRange],
    () => fetchStatsHistory(timeRange),
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}
