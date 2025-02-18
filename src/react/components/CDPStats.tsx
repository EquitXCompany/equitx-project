import { Box, Paper, Typography } from "@mui/material";
import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { useCdps } from "../hooks/useCdps";
import { Link } from "react-router-dom";
import { PieChart } from "@mui/x-charts";
import { useLatestTVLMetricsForAllAssets } from "../hooks/useTvlMetrics";
import { CDPMetricsData, TVLMetricsData } from "../hooks/types";
import { UseQueryResult } from "react-query";
import { useLatestCdpMetricsForAllAssets } from "../hooks/useCdpMetrics";
import { contractMapping, XAssetSymbol } from "../../contracts/contractConfig";
import { StackedHistogram } from "./charts/StackedHistogram";
import { LiquidationsHistory } from "./LiquidationsHistory";

export default function CDPStats() {
  const { data: cdps, isLoading } = useCdps();
  const TVLMetricsResults = useLatestTVLMetricsForAllAssets();
  const cdpMetricsResults = useLatestCdpMetricsForAllAssets();

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
      field: "contract_id",
      headerName: "Contract ID",
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Link to={`/cdps/${params.row.asset_symbol}`}>
          {params.row.contract_id}
        </Link>
      ),
    },
    { field: "lender", headerName: "Lender", width: 200 },
    {
      field: "xlm_deposited",
      headerName: "XLM Deposited",
      width: 150,
      valueFormatter: (params: { value: number }) =>
        params.value?.toString() || "0",
    },
    {
      field: "asset_lent",
      headerName: "Asset Lent",
      width: 150,
      valueFormatter: (params: { value: number }) =>
        params.value?.toString() || "0",
    },
    { field: "status", headerName: "Status", width: 120 },
    {
      field: "createdAt",
      headerName: "Created",
      width: 200,
      valueFormatter: (params: { value: string }) =>
        params.value ? new Date(params.value).toLocaleString() : "",
    },
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
      <Paper sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={cdps || []}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => `${row.contract_id}-${row.lender}`}
          pageSizeOptions={[10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
