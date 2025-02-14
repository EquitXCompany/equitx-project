import { Box, FormControl, InputLabel, MenuItem, Paper, Select } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsAxisContentProps } from "@mui/x-charts";
import { useState } from "react";
import BigNumber from "bignumber.js";
import { XAssetSymbol } from "../../../contracts/contractConfig";
import { formatCurrency, generateAssetColors } from "../../../utils/formatters";
interface HistogramData {
  bucketSize: number;
  min: number;
  max: number;
  buckets: BigNumber[];
}

interface StackedHistogramProps {
  data: Record<XAssetSymbol, HistogramData>;
  isLoading?: boolean;
  yAxisFormatter?: (value: number) => string;
  normalize: number,
}

export function StackedHistogram({
  data,
  isLoading = false,
  yAxisFormatter = (value: number) => formatCurrency(value, 0) + ' XLM',
  normalize = 1e7,
}: StackedHistogramProps) {
  const assets = Object.keys(data) as XAssetSymbol[];
  if(assets.length === 0) return;
  const firstAsset = assets[0]!;
  const baseBucketSize = data[firstAsset]?.bucketSize ?? 1;
  const initialGroups = 40;
  const [step, setStep] = useState(baseBucketSize*2);
  const [groups, setGroups] = useState(initialGroups);

  const histogramData = !isLoading
    ? (() => {
        const assetColors = generateAssetColors(assets);
        if (!data[firstAsset]) return { binLabels: [], series: [] };

        const { min: dataMin } = data[firstAsset];
        const maxRebinned = dataMin + groups*step;

        const binLabels = Array.from({ length: groups + 2 }, (_, idx) => {
          if (idx === 0) return `< ${dataMin}%`;
          if (idx === groups + 1) return `> ${maxRebinned}%`;
          return `${(dataMin + (idx) * step).toFixed(1)}%`;
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

            if (originalValue < dataMin) newBuckets[0] += value.div(normalize).toNumber();
            else if (originalValue >= maxRebinned)
              newBuckets[newBuckets.length - 1] += value.div(normalize).toNumber();
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

  const Controls = () => (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Step</InputLabel>
        <Select
          value={step}
          label="Step"
          onChange={(e) => setStep(Number(e.target.value))}
        >
          {[1, 2, 3, 4].map((value) => (
            <MenuItem key={value*baseBucketSize} value={value*baseBucketSize}>
              {`${(baseBucketSize * value).toFixed(1)}`}
            </MenuItem>
          ))}
        </Select>
        <InputLabel>Groups</InputLabel>
        <Select
          value={groups}
          label="Groups"
          onChange={(e) => setGroups(Number(e.target.value))}
        >
          {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((value) => (
            <MenuItem key={value} value={value}>
              {`${value}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

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
            {item.label} - {yAxisFormatter(item.value)}
          </div>
        ))}
      </Paper>
    );
  };

  return (
    <>
      <Controls />
      <Paper sx={{ p: 2, height: 400, width: "100%" }}>
        <BarChart
          xAxis={[{
            data: histogramData.binLabels,
            scaleType: "band",
            label: "",
          }]}
          yAxis={[{
            label: "",
            scaleType: "linear",
          }]}
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
    </>
  );
}
