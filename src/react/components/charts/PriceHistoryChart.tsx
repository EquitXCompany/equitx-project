import { useTheme } from "@mui/material/styles";
import { Box, useMediaQuery } from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { useMemo } from "react";
import { format } from "date-fns";
import { PriceHistory, usePriceHistory } from "../../hooks/usePriceHistory";
import BigNumber from "bignumber.js";
import { formatCurrency } from "../../../utils/formatters";

function findClosestPrice(timestamp: Date, xlmPrices: PriceHistory[]): number {
  return xlmPrices
    .reduce((closest, current) => {
      const currentDiff = Math.abs(
        current.timestamp.getTime() - timestamp.getTime()
      );
      const closestDiff = Math.abs(
        closest.timestamp.getTime() - timestamp.getTime()
      );
      return currentDiff < closestDiff ? current : closest;
    })
    .price.div(1e14)
    .toNumber();
}

interface PriceHistoryChartProps {
  assetSymbol: string;
}

export default function PriceHistoryChart({
  assetSymbol,
}: PriceHistoryChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const dates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return { startDate: start, endDate: end };
  }, []);

  const { data: assetPrices, isLoading: isLoadingAsset } = usePriceHistory(
    assetSymbol,
    dates.startDate,
    dates.endDate
  );

  const { data: xlmPrices, isLoading: isLoadingXLM } = usePriceHistory(
    "XLM",
    dates.startDate,
    dates.endDate
  );

  const chartData = useMemo(() => {
    if (!assetPrices || !xlmPrices) return { xAxis: [], prices: [] };

    const data = assetPrices.map((assetPrice) => {
      const xlmUsdPrice = findClosestPrice(assetPrice.timestamp, xlmPrices);
      const priceInXLM = assetPrice.price
        .dividedBy(new BigNumber(xlmUsdPrice))
        .div(1e14);

      return {
        timestamp: assetPrice.timestamp.getTime(),
        price: priceInXLM.toNumber(),
      };
    });

    return {
      xAxis: data.map((d) => d.timestamp),
      prices: data.map((d) => d.price),
    };
  }, [assetPrices, xlmPrices]);

  if (isLoadingAsset || isLoadingXLM) {
    return <div>Loading chart data...</div>;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: 400,
        mt: 4,
        bgcolor: theme.palette.background.paper,
        borderRadius: 1,
        p: 2,
      }}
    >
      <LineChart
        xAxis={[
          {
            data: chartData.xAxis,
            scaleType: "time",
            valueFormatter: (value) =>
              format(new Date(value), isMobile ? "MM/dd" : "MM/dd/yyyy"),
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
    </Box>
  );
}
