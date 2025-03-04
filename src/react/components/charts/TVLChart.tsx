import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { formatCurrency } from "../../../utils/formatters";
import { ProtocolStatsData, TVLMetricsData } from "../../hooks/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface TVLChartProps {
  data: (ProtocolStatsData | TVLMetricsData)[];
  isLoading?: boolean;
  type?: "protocol" | "asset";
  assetSymbol?: string;
  height?: number;
  showTitle?: boolean;
}

export const TVLChart = ({
  data,
  isLoading,
  type = "protocol",
  assetSymbol,
  height = 300,
  showTitle = true,
}: TVLChartProps) => {
  const theme = useTheme();

  // Define theme-aware colors
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;
  const textColor = theme.palette.text.secondary;
  const borderColor = theme.palette.divider;
  const tooltipBackgroundColor =
    theme.palette.mode === "dark"
      ? "rgba(40, 40, 40, 0.9)"
      : "rgba(250, 250, 250, 0.9)";
  const tooltipTextColor = theme.palette.text.primary;

  const chartData = useMemo(() => {
    const processedData = data.map((item) => ({
      timestamp: new Date(item.timestamp),
      tvl:
        type === "protocol"
          ? (
              item as ProtocolStatsData
            ).globalMetrics.totalValueLocked.toNumber()
          : (item as TVLMetricsData).tvlUSD.toNumber(),
      staked:
        type === "protocol"
          ? (item as ProtocolStatsData).globalMetrics.totalStaked.toNumber()
          : (item as TVLMetricsData).totalXassetsStakedUSD.toNumber(),
    }));

    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      labels: processedData.map((d) => {
        const date = new Date(d.timestamp);
        return date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }),
      datasets: [
        {
          label: "Total Staked",
          data: processedData.map((d) => d.staked),
          stack: "stack0",
          backgroundColor: secondaryColor,
          borderColor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          borderWidth: 1,
          hoverBackgroundColor: theme.palette.secondary.light,
        },
        {
          label: "TVL",
          data: processedData.map((d) => d.tvl),
          backgroundColor: primaryColor,
          stack: "stack0",
          borderColor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          borderWidth: 1,
          hoverBackgroundColor: theme.palette.primary.light,
        },
      ],
    };
  }, [
    data,
    type,
    primaryColor,
    secondaryColor,
    theme.palette.mode,
    theme.palette.primary.light,
    theme.palette.secondary.light,
  ]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            color: textColor,
            font: {
              family: theme.typography.fontFamily,
              size: 12,
            },
            boxWidth: 15,
            padding: 15,
          },
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
          backgroundColor: tooltipBackgroundColor,
          titleColor: tooltipTextColor,
          bodyColor: tooltipTextColor,
          borderColor: borderColor,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context: any) => {
              const value = context.raw;
              return `${context.dataset.label}: ${formatCurrency(value, 14, 2, "USD")}`;
            },
            title: (items: any) => {
              return items[0].label;
            },
          },
        },
      },
      scales: {
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: textColor,
            font: {
              family: theme.typography.fontFamily,
              size: 12,
            },
            callback: (value: any) => formatCurrency(value, 14, 0, "USD"),
          },
          grid: {
            color: borderColor,
            drawBorder: false,
          },
        },
        x: {
          stacked: true,
          grid: {
            display: false,
            drawBorder: true,
            color: borderColor,
          },
          ticks: {
            maxTicksLimit: 8,
            color: textColor,
            font: {
              family: theme.typography.fontFamily,
              size: 12,
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
    }),
    [
      textColor,
      tooltipBackgroundColor,
      tooltipTextColor,
      borderColor,
      theme.typography.fontFamily,
    ]
  );

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        boxShadow: theme.shadows[1],
      }}
    >
      {showTitle && (
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            color: theme.palette.text.primary,
            fontWeight: 500,
            mb: 2,
          }}
        >
          {type === "protocol"
            ? "Protocol TVL & Staked"
            : `${assetSymbol} TVL & Staked`}
        </Typography>
      )}
      {isLoading ? (
        <Box
          height={height}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography color={theme.palette.text.secondary}>
            Loading chart data...
          </Typography>
        </Box>
      ) : (
        <Box
          height={height}
          sx={{
            "& canvas": {
              borderRadius: 1,
            },
          }}
        >
          <Bar data={chartData} options={options} />
        </Box>
      )}
    </Paper>
  );
};
