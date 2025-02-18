import { useMemo } from "react";
import { Box, Paper, Grid, Typography } from "@mui/material";
import { useLiquidations } from "../hooks/useLiquidations";
import { useAllStabilityPoolMetadata } from "../hooks/useStabilityPoolMetadata";
import { BarChart } from "./charts/BarChart";
import BigNumber from "bignumber.js";
import { formatCurrency, generateAssetColors } from "../../utils/formatters";
import { XAssetSymbol } from "../../contracts/contractConfig";

export const LiquidationsHistory = () => {
  const { data: liquidations, isLoading: isLiquidationsLoading } =
    useLiquidations();
  const { data: stabilityPoolData } = useAllStabilityPoolMetadata();

  const metrics = useMemo(() => {
    if (!liquidations || !stabilityPoolData) return null;

    // Initialize assetTotals dynamically
    const assetTotals = Object.keys(stabilityPoolData).reduce(
      (acc, asset) => {
        acc[asset as XAssetSymbol] = {
          xlm: new BigNumber(0),
          usd: new BigNumber(0),
        };
        return acc;
      },
      {} as Record<XAssetSymbol, { xlm: BigNumber; usd: BigNumber }>
    );

    let largestLiquidation = { xlm: new BigNumber(0), usd: new BigNumber(0) };
    let totalLiquidated = { xlm: new BigNumber(0), usd: new BigNumber(0) };

    liquidations.forEach((liquidation) => {
      const stabilityData = stabilityPoolData[liquidation.asset];
      if (!stabilityData) return;

      const xlmAmount = liquidation.liquidatedAmount;
      const usdAmount = liquidation.liquidatedAmountUsd;

      // Update asset totals
      if (!assetTotals[liquidation.asset]) {
        assetTotals[liquidation.asset] = {
          xlm: new BigNumber(0),
          usd: new BigNumber(0),
        };
      }
      assetTotals[liquidation.asset].xlm =
        assetTotals[liquidation.asset].xlm.plus(xlmAmount);
      assetTotals[liquidation.asset].usd =
        assetTotals[liquidation.asset].usd.plus(usdAmount);

      // Update largest liquidation
      if (xlmAmount.isGreaterThan(largestLiquidation.xlm)) {
        largestLiquidation = { xlm: xlmAmount, usd: usdAmount };
      }

      // Update total liquidated
      totalLiquidated.xlm = totalLiquidated.xlm.plus(xlmAmount);
      totalLiquidated.usd = totalLiquidated.usd.plus(usdAmount);
    });

    return {
      assetTotals,
      largestLiquidation,
      totalLiquidated,
    };
  }, [liquidations, stabilityPoolData]);

  const chartData = useMemo(() => {
    if (!liquidations || !stabilityPoolData) return [];

    const liquidationsByDay = liquidations.reduce(
      (acc, liquidation) => {
        const date = liquidation.timestamp.toLocaleDateString();
        if (!acc[date]) {
          acc[date] = Object.keys(stabilityPoolData).reduce(
            (assets, asset) => {
              assets[`i${asset}`] = 0;
              return assets;
            },
            { date, count: 0 } as any
          );
        }

        const assetKey = `i${liquidation.asset}`;
        acc[date][assetKey] += liquidation.liquidatedAmount.div(1e7).toNumber();
        acc[date].count += 1;
        return acc;
      },
      {} as Record<string, any>
    );

    return Object.values(liquidationsByDay);
  }, [liquidations, stabilityPoolData]);

  const assetColors = useMemo(() => {
    if (!stabilityPoolData) return {};
    return generateAssetColors(
      Object.keys(stabilityPoolData) as XAssetSymbol[]
    );
  }, [stabilityPoolData]);

  if (isLiquidationsLoading) {
    return <Typography>Loading liquidations data...</Typography>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Liquidation History
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Total Liquidated
            </Typography>
            <Typography variant="h6">
              {formatCurrency(
                metrics?.totalLiquidated.xlm.toNumber() || 0,
                7,
                2
              )}{" "}
              XLM
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatCurrency(
                metrics?.totalLiquidated.usd.toNumber() || 0,
                14,
                2,
                "USD"
              )}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Largest Liquidation
            </Typography>
            <Typography variant="h6">
              {formatCurrency(
                metrics?.largestLiquidation.xlm.toNumber() || 0,
                7,
                2
              )}{" "}
              XLM
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatCurrency(
                metrics?.largestLiquidation.usd.toNumber() || 0,
                14,
                2,
                "USD"
              )}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Asset Breakdown
            </Typography>
            {metrics?.assetTotals &&
              Object.entries(metrics.assetTotals).map(([asset, amounts]) => (
                <Box key={asset} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    {asset}: {formatCurrency(amounts.xlm.toNumber(), 7, 2)} XLM
                  </Typography>
                </Box>
              ))}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
        <Box height={300}>
          <BarChart
            data={chartData}
            xAxis={{
              dataKey: "date",
              scaleType: "band",
            }}
            series={Object.keys(stabilityPoolData || {}).map((asset) => ({
              dataKey: `i${asset}`,
              label: asset.substring(1), // Remove 'x' prefix
              valueFormatter: (value: number) =>
                `${formatCurrency(value, 0, 2, "XLM")}`,
              color: assetColors[asset as XAssetSymbol] || "",
            }))}
          />
        </Box>
      </Paper>
    </Box>
  );
};
