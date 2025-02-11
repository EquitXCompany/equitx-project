import { useMemo, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from "@mui/material";

import { useLatestProtocolStats, useProtocolStatsHistory } from "../hooks/useProtocolStats";
import { useLatestCdpMetrics } from "../hooks/useCdpMetrics";
import { useLatestTVLMetrics } from "../hooks/useTvlMetrics";
import { useLatestUtilizationMetrics } from "../hooks/useUtilizationMetrics";
import { MetricCard } from "./common/MetricCard";
import { TVLChart } from "./charts/TVLChart";
import { formatCurrency, formatPercentage } from "../../utils/formatters";
import { contractMapping, type XAssetSymbol } from "../../contracts/contractConfig";

const assetSymbols = Object.keys(contractMapping) as XAssetSymbol[];

export default function Dashboard() {
  const dateParams = useMemo(() => ({
    start_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date().toISOString(),
  }), []);

  const { 
    data: protocolStats, 
    isLoading: statsLoading, 
    error: statsError 
  } = useLatestProtocolStats();
  
  const { 
    data: statsHistory, 
    isLoading: historyLoading,
    error: historyError 
  } = useProtocolStatsHistory(dateParams);

  // Top section metrics
  const topMetrics = [
    {
      title: "Total Value Locked",
      value: protocolStats?.globalMetrics.totalValueLocked,
      format: (val: any) => formatCurrency(val, 2, "XLM"),
      change: protocolStats?.growthMetrics.tvlGrowth24h,
    },
    {
      title: "Total Market Cap",
      value: protocolStats?.globalMetrics.totalValueLocked,
      format: (val: any) => formatCurrency(val, 2, "USD"),
    },
    {
      title: "Total Staked",
      value: protocolStats?.globalMetrics.totalValueLocked,
      format: (val: any) => formatCurrency(val, 2, "XLM"),
    },
    {
      title: "Circulating Supply",
      value: protocolStats?.volumeMetrics.dailyVolume,
      format: (val: any) => formatCurrency(val, 2, "XLM"),
    },
  ];

  // CDP Table data preparation with error handling
  const cdpRows = assetSymbols.map(symbol => {
    const { data: cdpMetrics, error: cdpError } = useLatestCdpMetrics(symbol);
    const { data: tvlMetrics, error: tvlError } = useLatestTVLMetrics(symbol);
    const { data: utilizationMetrics, error: utilizationError } = useLatestUtilizationMetrics(symbol);

    if (cdpError || tvlError || utilizationError) {
      return {
        asset: symbol,
        error: true,
      };
    }

    return {
      asset: symbol,
      collateralRatio: cdpMetrics?.averageCollateralizationRatio,
      rewardFrequency: "Daily",
      deposits: tvlMetrics?.totalXlmLocked,
      tvl: tvlMetrics?.tvlUSD,
    };
  });

  if (statsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load protocol statistics. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: "#0a0b1e", minHeight: "100vh" }}>
      {/* Top Metrics Grid */}
      <Grid container spacing={3} mb={4}>
        {topMetrics.map((metric, index) => (
          <Grid item xs={12} md={3} key={index}>
            <MetricCard
              title={metric.title}
              value={metric.format(metric.value)}
              change={metric.change}
              isLoading={statsLoading}
            />
          </Grid>
        ))}
      </Grid>

      {/* TVL Chart */}
      <Paper sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", mb: 4 }}>
        {historyError ? (
          <Alert severity="error">Failed to load TVL history data</Alert>
        ) : (
          <TVLChart 
            data={statsHistory || []} 
            type="protocol"
            isLoading={historyLoading} 
          />
        )}
      </Paper>

      {/* CDP Table */}
      <TableContainer component={Paper} sx={{ bgcolor: "rgba(0, 0, 0, 0.2)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell>Oracle Provider</TableCell>
              <TableCell>Total Minted</TableCell>
              <TableCell>SP Deposits</TableCell>
              <TableCell>Market Cap</TableCell>
              <TableCell>Market Cap</TableCell>
              <TableCell>CDP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cdpRows.map((row) => (
              <TableRow key={row.asset}>
                <TableCell>{row.asset}</TableCell>
                {row.error ? (
                  <TableCell colSpan={6}>
                    <Alert severity="error" sx={{ my: 1 }}>
                      Failed to load data for this asset
                    </Alert>
                  </TableCell>
                ) : (
                  <>
                    <TableCell>Stellar</TableCell>
                    <TableCell>{formatCurrency(row.deposits!, 2, "XLM")}</TableCell>
                    <TableCell>{formatCurrency(row.deposits!, 2, "XLM")}</TableCell>
                    <TableCell>{formatCurrency(row.tvl!, 2, "USD")}</TableCell>
                    <TableCell>{formatCurrency(row.tvl!, 2, "XLM")}</TableCell>
                    <TableCell>
                      <Typography
                        variant="button"
                        sx={{
                          bgcolor: "#6b2cf5",
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          cursor: "pointer",
                        }}
                      >
                        View
                      </Typography>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Global Loading State */}
      {statsLoading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}