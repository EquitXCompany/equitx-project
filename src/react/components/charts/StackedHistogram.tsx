import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  useTheme,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsAxisContentProps } from "@mui/x-charts";
import { useState } from "react";
import BigNumber from "bignumber.js";
import { formatCurrency, generateAssetColors } from "../../../utils/formatters";

interface HistogramData {
  bucketSize: number;
  min: number;
  max: number;
  buckets: BigNumber[];
}

interface StackedHistogramProps {
  data: Record<string, HistogramData>;
  isLoading?: boolean;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  normalize: number;
}

export function StackedHistogram({
  data,
  isLoading = false,
  yAxisFormatter = (value: number) => formatCurrency(value, 0),
  normalize = 1e7,
  tooltipFormatter = (value: number) => formatCurrency(value, 0) + " XLM",
}: StackedHistogramProps) {
  const theme = useTheme();
  const assets = Object.keys(data)
  if (assets.length === 0) return;
  const firstAsset = assets[0]!;
  const baseBucketSize = data[firstAsset]?.bucketSize ?? 1;
  const initialGroups = 40;
  const [step, setStep] = useState(baseBucketSize * 2);
  const [groups, setGroups] = useState(initialGroups);

  const histogramData = !isLoading
    ? (() => {
        const assetColors = generateAssetColors(assets);
        if (!data[firstAsset]) return { binLabels: [], series: [] };

        const { min: dataMin } = data[firstAsset];
        const maxRebinned = dataMin + groups * step;

        const binLabels = Array.from({ length: groups + 2 }, (_, idx) => {
          if (idx === 0) return `< ${dataMin}%`;
          if (idx === groups + 1) return `> ${maxRebinned}%`;
          return `${(dataMin + idx * step).toFixed(1)}%`;
        });

        const series = assets.map((asset) => {
          const assetData = data[asset];
          if (!assetData)
            return {
              data: Array(binLabels.length).fill(0),
              label: asset,
              stack: "total",
              color: assetColors[asset],
            };

          const newBuckets = Array(groups + 2).fill(0);
          const { buckets, min, bucketSize } = assetData;

          buckets.forEach((value, idx) => {
            const originalValue = min + idx * bucketSize;
            const newBinIndex = Math.floor((originalValue - dataMin) / step);

            if (originalValue < dataMin)
              newBuckets[0] += value.div(normalize).toNumber();
            else if (originalValue >= maxRebinned)
              newBuckets[newBuckets.length - 1] += value
                .div(normalize)
                .toNumber();
            else newBuckets[newBinIndex + 1] += value.div(normalize).toNumber();
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

  const CustomAxisTooltipContent = (props: ChartsAxisContentProps) => {
    const { axisData, dataIndex } = props;
    if (dataIndex === null || dataIndex === undefined) return null;

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
          padding: "8px 12px",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "4px",
          boxShadow: theme.shadows[3],
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
          {axisData?.x?.value !== null ? (axisData?.x?.value as string) : ""}
        </div>
        {stackedValues.map((item) => (
          <div key={item.label} style={{ color: item.color }}>
            {item.label} - {tooltipFormatter(item.value)}
          </div>
        ))}
      </Paper>
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          color: theme.palette.text.secondary,
        }}
      >
        Loading chart data...
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        position: "relative", 
        width: "100%", 
        height: "100%",
        bgcolor: theme.palette.background.paper,
        borderRadius: 1,
      }}
    >
      {/* Controls container with padding to ensure visibility */}
      <Box
        sx={{
          p: 2,
          pb: 0,
          padding: "30px",
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          minHeight: "48px", // Ensure space for controls
        }}
      >
        <FormControl variant="outlined" size="small" sx={{ minWidth: 100 }}>
          <InputLabel
            id="step-label"
            sx={{
              transform: "translate(14px, -17px) scale(0.75)",
              "&.Mui-focused": {
                transform: "translate(14px, -17px) scale(0.75)",
              },
              backgroundColor: theme.palette.background.paper,
              padding: "0 4px",
              zIndex: 1,
              color: theme.palette.text.secondary,
            }}
            shrink
          >
            Step
          </InputLabel>
          <Select
            labelId="step-label"
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            notched
            sx={{
              color: theme.palette.text.primary,
              "& .MuiSelect-icon": {
                color: theme.palette.text.secondary,
              },
            }}
          >
            {[1, 2, 3, 4].map((value) => (
              <MenuItem
                key={value * baseBucketSize}
                value={value * baseBucketSize}
              >
                {`${(baseBucketSize * value).toFixed(1)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 100 }}>
          <InputLabel
            id="groups-label"
            sx={{
              transform: "translate(14px, -17px) scale(0.75)",
              "&.Mui-focused": {
                transform: "translate(14px, -17px) scale(0.75)",
              },
              backgroundColor: theme.palette.background.paper,
              padding: "0 4px",
              zIndex: 1,
              color: theme.palette.text.secondary,
            }}
            shrink
          >
            Groups
          </InputLabel>
          <Select
            labelId="groups-label"
            value={groups}
            onChange={(e) => setGroups(Number(e.target.value))}
            notched
            sx={{
              color: theme.palette.text.primary,
              "& .MuiSelect-icon": {
                color: theme.palette.text.secondary,
              },
            }}
          >
            {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((value) => (
              <MenuItem key={value} value={value}>
                {`${value}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Chart container */}
      <Box
        sx={{
          width: "100%",
          height: "calc(100% - 48px)", // Subtract control height
          position: "relative",
          minHeight: "300px",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            "& > *": {
              width: "100% !important",
              height: "100% !important",
            },
          }}
        >
          <BarChart
            xAxis={[
              {
                data: histogramData.binLabels,
                scaleType: "band",
                label: "",
                tickLabelStyle: {
                  fill: theme.palette.text.secondary,
                  fontSize: 12,
                },
              },
            ]}
            yAxis={[
              {
                label: "",
                scaleType: "linear",
                tickLabelStyle: {
                  fill: theme.palette.text.secondary,
                  fontSize: 12,
                },
                valueFormatter: yAxisFormatter,
              },
            ]}
            series={histogramData.series}
            width={undefined}
            height={undefined}
            bottomAxis={{
              tickLabelStyle: {
                angle: 45,
                textAnchor: "start",
                fill: theme.palette.text.secondary,
              },
            }}
            tooltip={{
              trigger: "axis",
              axisContent: CustomAxisTooltipContent,
            }}
            legend={{
              hidden: true,
            }}
            margin={{ top: 20, right: 20, bottom: 70, left: 70 }}
            sx={{
              "& .MuiBarElement-root:hover": {
                filter: "brightness(0.9)",
              },
              "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": {
                stroke: theme.palette.divider,
              },
              "& .MuiChartsAxis-label": {
                fill: theme.palette.text.primary,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}