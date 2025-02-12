import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "react-query";
import { apiClient } from "../../utils/apiClient";
import { LiquidationData } from "./types";
import BigNumber from "bignumber.js";

function transformLiquidation(data: any): LiquidationData {
  return {
    cdpId: data.cdpId,
    asset: data.asset,
    liquidatedAmount: new BigNumber(data.liquidatedAmount),
    liquidatedAmountUsd: new BigNumber(data.liquidatedAmountUsd),
    debtCovered: new BigNumber(data.debtCovered),
    timestamp: new Date(data.timestamp),
    collateralizationRatioAtLiquidation: new BigNumber(data.collateralizationRatioAtLiquidation),
  };
}

async function fetchAllLiquidations(): Promise<LiquidationData[]> {
  const { data } = await apiClient.get("/api/liquidations");
  return data.map(transformLiquidation);
}

async function fetchLiquidationsByAsset(assetSymbol: string): Promise<LiquidationData[]> {
  const { data } = await apiClient.get(`/api/liquidations/asset/${assetSymbol}`);
  return data.map(transformLiquidation);
}

async function fetchLiquidationsByCDP(cdpId: string): Promise<LiquidationData[]> {
  const { data } = await apiClient.get(`/api/liquidations/cdp/${cdpId}`);
  return data.map(transformLiquidation);
}

export function useLiquidations(
  options?: Omit<UseQueryOptions<LiquidationData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<LiquidationData[], Error> {
  return useQuery<LiquidationData[], Error>(
    ["liquidations"],
    fetchAllLiquidations,
    {
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useLiquidationsByAsset(
  assetSymbol: string,
  options?: Omit<UseQueryOptions<LiquidationData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<LiquidationData[], Error> {
  return useQuery<LiquidationData[], Error>(
    ["liquidations", "asset", assetSymbol],
    () => fetchLiquidationsByAsset(assetSymbol),
    {
      enabled: !!assetSymbol,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}

export function useLiquidationsByCDP(
  cdpId: string,
  options?: Omit<UseQueryOptions<LiquidationData[], Error>, "queryKey" | "queryFn">
): UseQueryResult<LiquidationData[], Error> {
  return useQuery<LiquidationData[], Error>(
    ["liquidations", "cdp", cdpId],
    () => fetchLiquidationsByCDP(cdpId),
    {
      enabled: !!cdpId,
      refetchInterval: 300000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    }
  );
}