import { useTheme } from "@mui/material/styles";
import {
  Box,
  Grid2 as Grid,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PriceHistory, usePriceHistory } from "../../hooks/usePriceHistory";
import BigNumber from "bignumber.js";
import { formatCurrency } from "../../../utils/formatters";

type ChartData = {
  timestamp: Date;
  price: BigNumber | null;
};

// Reduce price history data to daily average
function scopeDaily(
  priceHistory: PriceHistory[],
  start: Date,
  end: Date,
): ChartData[] {
  // Create a map to group prices by day using date string as key
  const dailyGroups: Map<string, PriceHistory[]> = new Map();

  priceHistory.forEach((price) => {
    const year = price.timestamp.getFullYear();
    const month = price.timestamp.getMonth();
    const day = price.timestamp.getDate();
    const dayKey = `${year}-${month}-${day}`;

    if (!dailyGroups.has(dayKey)) {
      dailyGroups.set(dayKey, []);
    }
    dailyGroups.get(dayKey)!.push(price);
  });

  // Calculate daily averages
  const result: ChartData[] = [];
  const current = new Date(start);
  const endTime = end.getTime();

  while (current.getTime() <= endTime) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const day = current.getDate();
    const dayKey = `${year}-${month}-${day}`;
    const pricesForDay = dailyGroups.get(dayKey);

    // If there's no data for this month, leave data point null
    let price: null | BigNumber = null;
    if (pricesForDay && pricesForDay.length > 0) {
      // Calculate average price for the day
      const sum = pricesForDay.reduce(
        (acc, p) => acc.plus(p.price),
        new BigNumber(0),
      );
      price = sum.dividedBy(pricesForDay.length);
    }

    result.push({
      timestamp: new Date(year, month, day),
      price,
    });

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// Reduce price history data to monthly average
function scopeMonthly(
  priceHistory: PriceHistory[],
  start: Date,
  end: Date,
): ChartData[] {
  // Create a map to group prices by month
  const monthlyGroups: Map<string, PriceHistory[]> = new Map();

  priceHistory.forEach((price) => {
    const year = price.timestamp.getFullYear();
    const month = price.timestamp.getMonth();
    const monthKey = `${year}-${month}`;

    if (!monthlyGroups.has(monthKey)) {
      monthlyGroups.set(monthKey, []);
    }
    monthlyGroups.get(monthKey)!.push(price);
  });

  // Calculate monthly averages
  const result: ChartData[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthKey = `${year}-${month}`;
    const pricesForMonth = monthlyGroups.get(monthKey);

    // If there's no data for this month, leave data point null
    let price: null | BigNumber = null;
    if (pricesForMonth && pricesForMonth.length > 0) {
      // Calculate average price for the month
      const sum = pricesForMonth.reduce(
        (acc, p) => acc.plus(p.price),
        new BigNumber(0),
      );
      price = sum.dividedBy(pricesForMonth.length);
    }

    // Use the first day of the month as the timestamp
    result.push({
      timestamp: new Date(year, month, 1),
      price,
    });

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

interface PriceHistoryChartProps {
  assetSymbol: string;
}

export default function PriceHistoryChart({
  assetSymbol,
}: PriceHistoryChartProps) {
  const theme = useTheme();

  // Control for changing views of price history by time scope
  const [scope, setScope] = useState("monthly");
  const scopeFn = scope === "daily" ? scopeDaily : scopeMonthly;

  const dates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return { startDate: start, endDate: end };
  }, []);

  const { data: assetPrices, isLoading: isLoadingAsset } = usePriceHistory(
    assetSymbol,
    dates.startDate,
    dates.endDate,
  );

  const { data: xlmPrices, isLoading: isLoadingXLM } = usePriceHistory(
    "XLM",
    dates.startDate,
    dates.endDate,
  );

  const chartData = useMemo(() => {
    if (!assetPrices || !xlmPrices) return { xAxis: [], prices: [] };

    // Get average prices scoped by the selected unit, daily vs monthly
    let scopedAsset = scopeFn(assetPrices, dates.startDate, dates.endDate);
    let scopedXlm = scopeFn(xlmPrices, dates.startDate, dates.endDate);

    // Reduce the data into an object of labels for x-axis and price data
    return scopedAsset.reduce<{ xAxis: number[]; prices: (number | null)[] }>(
      (acc, assetPrice, index) => {
        const timestamp = assetPrice.timestamp.getTime();
        acc.xAxis.push(timestamp);

        // Calculate price of asset in XLM, or leave as null if not available
        const xlmPrice = scopedXlm[index]?.price?.div(1e14) ?? null;
        const price =
          assetPrice.price === null || xlmPrice === null
            ? null
            : assetPrice.price
                .dividedBy(new BigNumber(xlmPrice))
                .div(1e14)
                .toNumber();
        acc.prices.push(price);

        return acc;
      },
      { xAxis: [], prices: [] },
    );
  }, [assetPrices, xlmPrices, scope, dates.startDate, dates.endDate]);

  if (isLoadingAsset || isLoadingXLM) {
    return <div>Loading chart data...</div>;
  }

  return (
    <Paper
      component={Box}
      sx={{
        width: "100%",
        mt: 4,
        bgcolor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        p: 4,
      }}
    >
      <Grid container spacing={2} sx={{ alignItems: "center" }}>
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{ flex: 1, textAlign: "left" }}
        >
          Price History
        </Typography>

        <Select
          onChange={(e) => {
            setScope(e.target.value);
          }}
          value={scope}
        >
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
        </Select>
      </Grid>

      <LineChart
        xAxis={[
          {
            data: chartData.xAxis,
            scaleType: "time",
            valueFormatter: (value, ctx) =>
              ctx.location === "tick"
                ? format(new Date(value), "MMM")
                : format(new Date(value), "MM-dd-yyyy"),
            tickLabelStyle: {
              fill: theme.palette.text.secondary,
              fontSize: 12,
            },
          },
        ]}
        yAxis={[
          {
            valueFormatter: (value) => formatCurrency(value, 0, 1, ""),
            tickLabelStyle: {
              fill: theme.palette.text.secondary,
              fontSize: 12,
            },
          },
        ]}
        series={[
          {
            data: chartData.prices,
            area: true,
            curve: "linear",
            color: theme.palette.primary.main,
            showMark: false,
            valueFormatter: (value) => formatCurrency(value ?? 0, 0, 2, "XLM"),
          },
        ]}
        height={350}
        slotProps={{
          legend: {
            hidden: true,
          },
        }}
        tooltip={{
          trigger: "axis",
        }}
        sx={{
          ".MuiLineElement-root": {
            strokeWidth: 2,
          },
          ".MuiAreaElement-root": {
            fill: `${theme.palette.primary.main}`,
            fillOpacity: 0.2,
          },
        }}
      />
    </Paper>
  );
}
