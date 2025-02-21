import { Box, Paper, Typography } from "@mui/material";
import { formatCurrency } from "../../utils/formatters";
import { DataGrid } from "@mui/x-data-grid";
import { useCdps } from "../hooks/useCdps";
import { PieChart } from "@mui/x-charts";
import { useLatestTVLMetricsForAllAssets } from "../hooks/useTvlMetrics";
import { CDPMetricsData, TVLMetricsData } from "../hooks/types";
import { UseQueryResult } from "react-query";
import { useLatestCdpMetricsForAllAssets } from "../hooks/useCdpMetrics";
import { contractMapping, XAssetSymbol } from "../../contracts/contractConfig";
import { StackedHistogram } from "./charts/StackedHistogram";
import { LiquidationsHistory } from "./LiquidationsHistory";
import { useAllStabilityPoolMetadata } from "../hooks/useStabilityPoolMetadata";
import BigNumber from "bignumber.js";
import { useMemo } from "react";

export default function CDPStats() {
  const { data: cdps, isLoading: cdpsLoading } = useCdps();
  const { data: stabilityPoolData, isLoading: spLoading } =
    useAllStabilityPoolMetadata();
  const TVLMetricsResults = useLatestTVLMetricsForAllAssets();
  const cdpMetricsResults = useLatestCdpMetricsForAllAssets();

  // Wait for stability pool data to be loaded before processing CDPs
  const enrichedCdps = useMemo(() => {
    if (spLoading || !cdps || !stabilityPoolData) return [];
    return cdps.map((cdp) => {
      const spMetadata = stabilityPoolData[cdp.asset.symbol as XAssetSymbol];
      if (!spMetadata) return cdp;
      const collateralXLM = new BigNumber(cdp.xlm_deposited);
      const debtAsset = new BigNumber(cdp.asset_lent);
      const debtValueXLM = debtAsset
        .times(spMetadata.lastpriceAsset)
        .div(spMetadata.lastpriceXLM);

      const collateralRatio = collateralXLM.div(debtValueXLM).times(100);
      const netValue = collateralXLM.minus(debtValueXLM);
      const minRatio = new BigNumber(spMetadata.min_ratio).div(1e4);
      console.log(`debt asset is ${debtAsset.toString()} collateral xlm is ${collateralXLM.toString()} `)
      const liquidationPriceXLM = collateralXLM.times(1e7).div(debtAsset).div(minRatio);
      return {
        ...cdp,
        asset_symbol: cdp.asset.symbol,
        collateralRatio: collateralRatio.toNumber(),
        collateralXLM: formatCurrency(collateralXLM, 7, 2, "XLM"),
        debtAsset: formatCurrency(debtAsset, 7, 2, cdp.asset.symbol),
        debtValueXLM: formatCurrency(debtValueXLM, 7, 2, "XLM"),
        netValue: formatCurrency(netValue, 7, 2, "XLM"),
        liquidationPriceXLM: formatCurrency(liquidationPriceXLM, 7, 2, "XLM"),
      };
    });
  }, [cdps, stabilityPoolData, spLoading]);

  const piChartData: { id: number; value: number; label: string }[] | [] =
    !TVLMetricsResults.some((result) => result.isLoading)
      ? TVLMetricsResults.map((result: UseQueryResult, idx) => {
          return {
            id: idx,
            value: (result?.data as TVLMetricsData).totalXlmLocked
              .div(1e7)
              .toNumber(),
            label: (result?.data as TVLMetricsData).asset,
          };
        })
      : [];

  const columns = [
    {
      field: "asset_symbol",
      headerName: "xAsset",
      width: 100,
    },
    {
      field: "collateralRatio",
      headerName: "Collateral Ratio",
      width: 130,
      valueFormatter: (value: number) => {
        return `${value}%`;
      }

    },
    {
      field: "collateralXLM",
      headerName: "Collateral (XLM)",
      width: 130,
    },
    {
      field: "debtAsset",
      headerName: "Debt (xAsset)",
      width: 130,
    },
    {
      field: "debtValueXLM",
      headerName: "Debt Value (XLM)",
      width: 130,
    },
    {
      field: "netValue",
      headerName: "Net Value (XLM)",
      width: 130,
    },
    {
      field: "liquidationPriceXLM",
      headerName: "Liquidation Price (XLM)",
      width: 160,
    },
    { field: "status", headerName: "Status", width: 120 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CDP Statistics
      </Typography>

      <Typography variant="h5" gutterBottom>
        XLM locked by asset
      </Typography>

      <Paper style={{ height: 400, width: "100%" }}>
        {!TVLMetricsResults.some((result) => result.isLoading) && (
          <PieChart series={[{ data: piChartData }]} />
        )}
      </Paper>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Collateral Ratio Distribution
      </Typography>

      {!cdpMetricsResults.some((result) => result.isLoading) && (
        <StackedHistogram
          data={Object.keys(contractMapping).reduce(
            (acc, asset) => {
              const result = cdpMetricsResults.find(
                (r) => r.data?.asset === asset
              );
              if (result?.data) {
                acc[asset as XAssetSymbol] =
                  result.data.collateralRatioHistogram;
              }
              return acc;
            },
            {} as Record<
              XAssetSymbol,
              CDPMetricsData["collateralRatioHistogram"]
            >
          )}
          isLoading={cdpMetricsResults.some((result) => result.isLoading)}
          normalize={1e7}
        />
      )}

      <LiquidationsHistory />
      {enrichedCdps && enrichedCdps.length > 0 && (
        <Paper sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={enrichedCdps}
            columns={columns}
            loading={cdpsLoading || spLoading}
            getRowId={(row) => `${row.contract_id}-${row.lender}`}
            pageSizeOptions={[10, 25, 50]}
          />
        </Paper>
      )}
    </Box>
  );
}
