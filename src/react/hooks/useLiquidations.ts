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
    collateralLiquidated: new BigNumber(data.collateralLiquidated),
    collateralLiquidatedUsd: new BigNumber(data.collateralLiquidatedUsd),
    principalRepaid: new BigNumber(data.principalRepaid),
    accruedInterestRepaid: new BigNumber(data.accruedInterestRepaid),
    collateralAppliedToInterest: new BigNumber(data.collateralAppliedToInterest),
    timestamp: new Date(data.timestamp),
    collateralizationRatio: Number(data.collateralizationRatio),
    xlmPrice: new BigNumber(data.xlmPrice),
    xassetPrice: new BigNumber(data.xassetPrice),
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