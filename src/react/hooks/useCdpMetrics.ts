import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
  useQueries,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import { CDPMetricsData, TimestampRange } from "./types";
import BigNumber from "bignumber.js";
import { contractMapping, XAssetSymbol } from "../../contracts/contractConfig";

function transformCDPMetrics(data: any): CDPMetricsData {
  return {
    asset: data.asset,
    totalCDPs: Number(data.totalCDPs),
    totalXLMLocked: new BigNumber(data.totalXLMLocked),
    collateralRatio: new BigNumber(data.collateralRatio),
    riskMetrics: {
      nearLiquidation: Number(data.riskMetrics.nearLiquidation),
      recentLiquidations: Number(data.riskMetrics.recentLiquidations),
      healthScore: Number(data.riskMetrics.healthScore),
    },
    volumeMetrics: {
      dailyVolume: new BigNumber(data.volumeMetrics.dailyVolume),
      weeklyVolume: new BigNumber(data.volumeMetrics.weeklyVolume),
      monthlyVolume: new BigNumber(data.volumeMetrics.monthlyVolume),
    },
    collateralRatioHistogram: {
      bucketSize: Number(data.collateralRatioHistogram.bucketSize),
      min: Number(data.collateralRatioHistogram.min),
      max: Number(data.collateralRatioHistogram.max),
      buckets: data.collateralRatioHistogram.buckets.map((b: string) => new BigNumber(b))
    },
    timestamp: new Date(data.timestamp),
  };
}

async function fetchLatestMetricsByAsset(assetSymbol: string): Promise<CDPMetricsData> {
  const { data } = await apiClient.get(`/api/cdp-metrics/${assetSymbol}/latest`);
  return transformCDPMetrics(data);
}

async function fetchMetricsHistory(
  assetSymbol: string,
  timeRange?: TimestampRange
): Promise<CDPMetricsData[]> {
  const params = new URLSearchParams();
  if (timeRange?.start_time) params.append('start_time', timeRange.start_time);
  if (timeRange?.end_time) params.append('end_time', timeRange.end_time);

  const { data } = await apiClient.get(
    `/api/cdp-metrics/${assetSymbol}/history?${params.toString()}`
  );
  return data.map(transformCDPMetrics);
}

export function useLatestCdpMetrics(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<CDPMetricsData, Error>, "queryKey" | "queryFn">
): UseQueryResult<CDPMetricsData, Error> {
  return useQuery<CDPMetricsData, Error>(
    ["cdp-metrics", assetSymbol, "latest"],
    () => fetchLatestMetricsByAsset(assetSymbol),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useLatestCdpMetricsForAllAssets(): UseQueryResult<CDPMetricsData, Error>[] {
  const assets = Object.keys(contractMapping) as XAssetSymbol[];
  
  return useQueries<UseQueryOptions<CDPMetricsData, Error>[]>(
    assets.map((asset) => ({
      queryKey: ["cdp-metrics", asset, "latest"],
      queryFn: () => fetchLatestMetricsByAsset(asset),
      enabled: true,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }))
  );
}

export function useCdpMetricsHistory(
  assetSymbol: string,
  timeRange?: TimestampRange,
  options?: Omit<UseQueryOptions<CDPMetricsData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<CDPMetricsData[], Error> {
  return useQuery<CDPMetricsData[], Error>(
    ["cdp-metrics", assetSymbol, "history", timeRange],
    () => fetchMetricsHistory(assetSymbol, timeRange),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}