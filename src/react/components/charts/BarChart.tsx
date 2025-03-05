import { BarChart as MuiBarChart } from '@mui/x-charts';
import { Box, Paper, useTheme } from '@mui/material';
import { ChartsAxisContentProps } from '@mui/x-charts';
import { generateAssetColors } from '../../../utils/formatters';

interface ChartData {
  [key: string]: string | number;
  date: string;
  value: number;
  count: number;
}

interface AxisConfig {
  dataKey: string;
  scaleType: 'band' | 'linear' | 'log';
}

interface SeriesConfig {
  dataKey: string;
  label: string;
  valueFormatter: (value: number) => string;
  color?: string;
}

interface BarChartProps {
  data: ChartData[];
  xAxis: AxisConfig;
  series: SeriesConfig[];
  height?: number;
  isLoading?: boolean;
}

export const BarChart = ({
  data,
  xAxis,
  series,
  height = 300,
  isLoading = false
}: BarChartProps) => {
  const theme = useTheme();

  const assetLabels = series.map(s => s.label);
  const assetColors = generateAssetColors(assetLabels);

  const seriesWithColors = series.map(s => ({
    ...s,
          type: 'bar' as const,
    stack: 'total',
    color: s.color || assetColors[s.label],
          valueFormatter: (value: number | null) => {
            if (value === null) return '';
            return s.valueFormatter(value);
          },
  }));

  const CustomAxisTooltipContent = (props: ChartsAxisContentProps) => {
    const { dataIndex } = props;
    if (dataIndex === null || dataIndex === undefined) return null;

    const stackedValues = seriesWithColors
      .map((s) => ({
        label: s.label,
        value: data[dataIndex]?.[s.dataKey] as number || 0,
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
          {data[dataIndex]?.[xAxis.dataKey] as string || ''}
        </div>
        {stackedValues.map((item) => (
          <div key={item.label} style={{ color: item.color }}>
            {item.label} - {item.value !== null ? seriesWithColors.find(s => s.label === item.label)?.valueFormatter(item.value) : ''}
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
        height,
        bgcolor: theme.palette.background.paper,
        borderRadius: 1,
      }}
    >
      <MuiBarChart
        dataset={data}
        xAxis={[{
          ...xAxis,
          tickLabelStyle: {
            angle: 45,
            textAnchor: 'start',
            fill: theme.palette.text.secondary,
            fontSize: 12,
          },
        }]}
        yAxis={[{
          tickLabelStyle: {
            fill: theme.palette.text.secondary,
            fontSize: 12,
          },
        }]}
        series={seriesWithColors}
        tooltip={{
          trigger: 'axis',
          axisContent: CustomAxisTooltipContent,
        }}
        height={height}
        margin={{
          left: 70,
          right: 20,
          top: 20,
          bottom: 70,
        }}
        legend={{
          hidden: true,
        }}
        sx={{
          "& .MuiBarElement-root:hover": {
            filter: "brightness(0.9)",
          },
          '.MuiChartsAxis-line, .MuiChartsAxis-tick': {
            stroke: theme.palette.divider,
          },
          '.MuiChartsAxis-grid': {
            stroke: 'rgba(255, 255, 255, 0.1)',
          },
          "& .MuiChartsAxis-label": {
            fill: theme.palette.text.primary,
          },
        }}
      />
    </Box>
  );
};
