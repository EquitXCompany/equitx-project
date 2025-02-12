import { Box, Paper, Typography } from "@mui/material";
import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { useCdps } from "../hooks/useCdps";
import { Link } from "react-router-dom";
import { PieChart } from "@mui/x-charts";
import { useLatestTVLMetricsForAllAssets } from "../hooks/useTvlMetrics";
import { TVLMetricsData } from "../hooks/types";
import { UseQueryResult } from "react-query";

export default function CDPStats() {
  const { data: cdps, isLoading } = useCdps();
  const TVLMetricsResults = useLatestTVLMetricsForAllAssets();

  // Chart not yet working, just putting chart infra in place
  const LR = 1.1; // Assuming LR as 1.1 as a constant for now
  const chartData =
    cdps?.map((cdp) => ({
      contractId: cdp.contract_id,
      cr: cdp.xlm_deposited.dividedBy(cdp.asset_lent),
      lr: LR,
    })) || [];

  const piChartData: { id: number; value: number; label: string }[] | [] =
    !TVLMetricsResults.some((result) => result.isLoading)
      ? TVLMetricsResults.map((result: UseQueryResult, idx) => {
          console.log(result);
          return {
            id: idx,
            value: (result?.data as TVLMetricsData).totalXlmLocked.toNumber(),
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
        Collateralization Ratio (CR) vs Liquidation Ratio (LR)
      </Typography>

      <Paper style={{ height: 400, width: "100%" }}>
        {!TVLMetricsResults.some((result) => result.isLoading) && (
          <PieChart series={[{ data: piChartData }]} />
        )}
        <BarChart
          xAxis={[
            {
              data: chartData.map((item) => item.contractId),
              scaleType: "band",
              label: "Contract ID",
            },
          ]}
          series={[
            {
              data: chartData.map((item) => item.cr.toNumber()),
              label: "CR Difference",
            },
          ]}
          width={800}
          height={400}
        />
      </Paper>

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
