import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import { UserMetricsData, TimestampRange } from "./types";
import BigNumber from "bignumber.js";

function transformUserMetrics(data: any): UserMetricsData {
  return {
    address: data.address,
    totalCDPs: Number(data.totalCDPs),
    activePositions: {
      totalValueLocked: new BigNumber(data.activePositions.totalValueLocked),
      totalDebt: new BigNumber(data.activePositions.totalDebt),
      averageCollateralizationRatio: new BigNumber(data.activePositions.averageCollateralizationRatio),
      totalAccruedInterest: new BigNumber(data.activePositions.totalAccruedInterest),
      totalInterestPaid: new BigNumber(data.activePositions.totalPaidInterest),
    },
    historicalMetrics: {
      totalVolume: new BigNumber(data.historicalMetrics.totalVolume),
      liquidationsReceived: Number(data.historicalMetrics.liquidationsReceived),
      liquidationsExecuted: Number(data.historicalMetrics.liquidationsExecuted),
    },
    riskProfile: {
      riskScore: Number(data.riskProfile.riskScore),
      lastActivity: new Date(data.riskProfile.lastActivity),
      averagePositionDuration: Number(data.riskProfile.averagePositionDuration),
    },
  };
}
async function fetchUserMetrics(address: string): Promise<UserMetricsData> {
  const { data } = await apiClient.get(`/api/user-metrics/${address}`);
  return transformUserMetrics(data);
}

async function fetchUserMetricsHistory(
  address: string,
  timeRange?: TimestampRange
): Promise<UserMetricsData[]> {
  const params = new URLSearchParams();
  if (timeRange?.start_time) params.append('start_time', timeRange.start_time);
  if (timeRange?.end_time) params.append('end_time', timeRange.end_time);

  const { data } = await apiClient.get(
    `/api/user-metrics/${address}/history?${params.toString()}`
  );
  return data.map(transformUserMetrics);
}

export function useUserMetrics(
  address: string,
  options?: Omit<UseQueryOptions<UserMetricsData, Error>, "queryKey" | "queryFn">
): UseQueryResult<UserMetricsData, Error> {
  return useQuery<UserMetricsData, Error>(
    ["user-metrics", address],
    () => fetchUserMetrics(address),
    {
      enabled: !!address,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useUserMetricsHistory(
  address: string,
  timeRange?: TimestampRange,
  options?: Omit<UseQueryOptions<UserMetricsData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<UserMetricsData[], Error> {
  return useQuery<UserMetricsData[], Error>(
    ["user-metrics", address, "history", timeRange],
    () => fetchUserMetricsHistory(address, timeRange),
    {
      enabled: !!address,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}