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
    // Map data to a consistent structure
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

    // Sort by timestamp
    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Limit to 3 data points per day
    const limitedData: typeof processedData = [];
    const dataByDay = new Map<string, typeof processedData>();
    
    // Group data points by day
    processedData.forEach(item => {
      const day = item.timestamp.toISOString().split('T')[0];
      if (!dataByDay.has(day!)) {
        dataByDay.set(day!, []);
      }
      dataByDay.get(day!)!.push(item);
    });
    
    // Limit to 3 points per day and flatten
    dataByDay.forEach((dayPoints, _) => {
      // If we have more than 3 points for a day, take evenly spaced samples
      if (dayPoints.length > 3) {
        const step = Math.floor(dayPoints.length / 3);
        limitedData.push(dayPoints[0]!); // First point
        if (dayPoints.length > 1) {
          limitedData.push(dayPoints[Math.min(step, dayPoints.length - 1)]!); // Middle point
        }
        if (dayPoints.length > 2) {
          limitedData.push(dayPoints[dayPoints.length - 1]!); // Last point
        }
      } else {
        // If 3 or fewer, include all
        limitedData.push(...dayPoints);
      }
    });
    
    // Re-sort the limited data
    limitedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Determine colors based on theme mode
    const borderColor = theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
    
    const primaryHoverColor = theme.palette.mode === "dark" 
      ? theme.palette.primary.dark 
      : theme.palette.primary.light;
      
    const secondaryHoverColor = theme.palette.mode === "dark" 
      ? theme.palette.secondary.dark 
      : theme.palette.secondary.light;

    return {
      labels: limitedData.map((d) => {
        const date = new Date(d.timestamp);
        return `${date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} ${date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }),
      datasets: [
        {
          label: "Total Staked",
          data: limitedData.map((d) => d.staked),
          stack: "stack0",
          backgroundColor: secondaryColor,
          borderColor: borderColor,
          borderWidth: 1,
          hoverBackgroundColor: secondaryHoverColor,
        },
        {
          label: "TVL",
          data: limitedData.map((d) => d.tvl),
          backgroundColor: primaryColor,
          stack: "stack0",
          borderColor: borderColor,
          borderWidth: 1,
          hoverBackgroundColor: primaryHoverColor,
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
    theme.palette.primary.dark,
    theme.palette.secondary.light,
    theme.palette.secondary.dark,
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
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 12,
            color: textColor,
            font: {
              family: theme.typography.fontFamily,
              size: 11,
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
        color: theme.palette.background.default,
        bgcolor: theme.palette.background.paper,
        boxShadow: theme.shadows[0],
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
