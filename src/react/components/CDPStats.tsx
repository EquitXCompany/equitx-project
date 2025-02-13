import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { useCdps } from "../hooks/useCdps";
import { Link } from "react-router-dom";
import { ChartsAxisContentProps, PieChart } from "@mui/x-charts";
import { useLatestTVLMetricsForAllAssets } from "../hooks/useTvlMetrics";
import { TVLMetricsData } from "../hooks/types";
import { UseQueryResult } from "react-query";
import { useLatestCdpMetricsForAllAssets } from "../hooks/useCdpMetrics";
import { formatCurrency, generateAssetColors } from "../../utils/formatters";
import { contractMapping, XAssetSymbol } from "../../contracts/contractConfig";
import { useState } from "react";

export default function CDPStats() {
  const { data: cdps, isLoading } = useCdps();
  const TVLMetricsResults = useLatestTVLMetricsForAllAssets();
  const cdpMetricsResults = useLatestCdpMetricsForAllAssets();
  const [groups, setGroups] = useState(40);
  const [step, setStep] = useState(10);

  // Process histogram data for stacked bar chart
  const histogramData = !cdpMetricsResults.some((result) => result.isLoading)
    ? (() => {
        const assets = Object.keys(contractMapping) as XAssetSymbol[];
        const assetColors = generateAssetColors(assets);
        const firstValidResult = cdpMetricsResults.find((r) => r.data)?.data;

        if (!firstValidResult) return { binLabels: [], series: [] };

        // Create bin structure based on groups and step
        const maxValue = groups * step;
        const binLabels = Array.from({ length: groups + 2 }, (_, idx) => {
          if (idx === 0) return "< 0%";
          if (idx === groups + 1) return `> ${maxValue}%`;
          return `+${idx * step}%`;
        });

        // Create series data for each asset
        const series = assets.map((asset) => {
          const result = cdpMetricsResults.find((r) => r.data?.asset === asset);
          if (!result?.data)
            return {
              data: Array(binLabels.length).fill(0),
              label: asset,
              stack: "total",
              color: assetColors[asset],
            };

          // Rebin the data according to new parameters
          const newBuckets = Array(groups + 2).fill(0);
          const { buckets, min, bucketSize } =
            result.data.collateralRatioHistogram;

          buckets.forEach((value, idx) => {
            const originalValue = min + idx * bucketSize;
            const newBinIndex = Math.floor(originalValue / step);

            if (originalValue < 0) newBuckets[0] += value.div(1e7).toNumber();
            else if (originalValue >= maxValue)
              newBuckets[newBuckets.length - 1] += value.div(1e7).toNumber();
            else newBuckets[newBinIndex + 1] += value.div(1e7).toNumber();
          });

          return {
            data: newBuckets,
            label: asset,
            stack: "total",
            color: assetColors[asset],
          };
        });

        return { binLabels, series };
      })()
    : { binLabels: [], series: [] };

  const Controls = () => (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Groups</InputLabel>
        <Select
          value={groups}
          label="Groups"
          onChange={(e) => setGroups(Number(e.target.value))}
        >
          {Array.from({ length: 9 }, (_, i) => (
            <MenuItem key={i} value={(i + 2) * 5}>
              {(i + 2) * 5}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Step</InputLabel>
        <Select
          value={step}
          label="Step"
          onChange={(e) => setStep(Number(e.target.value))}
        >
          {[5, 10, 15, 20].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  const CustomAxisTooltipContent = (props: ChartsAxisContentProps) => {
    const { axisData, dataIndex } = props;
    if (dataIndex === null || dataIndex === undefined) return null;
    // Get all series values for this bin
    const stackedValues = histogramData.series
      .map((s) => ({
        label: s.label,
        value: s.data[dataIndex],
        color: s.color,
      }))
      .filter((item) => item.value > 0);

    return (
      <Paper
        sx={{
          backgroundColor: "var(--color-dark-blue)",
          padding: "8px 12px",
          border: "1px solid rgba(0, 0, 0, 0.12)",
          borderRadius: "4px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
          {axisData?.x?.value !== null ? axisData?.x?.value as string : ""}
        </div>
        {stackedValues.map((item) => (
          <div key={item.label} style={{ color: item.color }}>
            {item.label} - {formatCurrency(item.value, 0)} XLM
          </div>
        ))}
      </Paper>
    );
  };

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

      <Controls />

      <Paper sx={{ p: 2, height: 400, width: "100%" }}>
        <BarChart
          xAxis={[
            {
              data: histogramData.binLabels,
              scaleType: "band",
              label: "",
            },
          ]}
          yAxis={[
            {
              label: "",
              scaleType: "linear",
            },
          ]}
          series={histogramData.series}
          width={700}
          height={350}
          bottomAxis={{
            tickLabelStyle: {
              angle: 45,
              textAnchor: "start",
            },
          }}
          tooltip={{
            trigger: "axis",
            axisContent: CustomAxisTooltipContent,
          }}
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
