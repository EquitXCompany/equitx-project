import { useMemo } from "react";
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
  useTheme,
} from "@mui/material";

import { useLatestProtocolStats, useProtocolStatsHistory } from "../hooks/useProtocolStats";
import { useLatestCdpMetrics } from "../hooks/useCdpMetrics";
import { useLatestTVLMetrics } from "../hooks/useTvlMetrics";
import { MetricCard } from "./common/MetricCard";
import { TVLChart } from "./charts/TVLChart";
import { formatCurrency } from "../../utils/formatters";
import { Link } from "react-router-dom";
import { useContractMapping } from "../../contexts/ContractMappingContext";

export default function Dashboard() {
  const theme = useTheme();
  const contractMapping = useContractMapping();
  const assetSymbols = Object.keys(contractMapping);

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
      format: (val: any) => formatCurrency(val, 14, 2, "USD"),
      change: protocolStats?.growthMetrics.tvlGrowth24h,
    },
    {
      title: "Total Market Cap",
      value: protocolStats?.globalMetrics.totalDebt,
      format: (val: any) => formatCurrency(val, 14, 2, "USD"),
    },
    {
      title: "Total Staked",
      value: protocolStats?.globalMetrics.totalStaked,
      format: (val: any) => formatCurrency(val, 14, 2, "USD"),
    },
    {
      title: "System Collateral Ratio",
      value: protocolStats?.riskMetrics.systemCollateralization,
      format: (value: any) => formatCurrency(value, 0, 2, "%"),
    }
  ];

  const cdpRows = assetSymbols.map(symbol => {
    const { data: cdpMetrics, error: cdpError } = useLatestCdpMetrics(symbol);
    const { data: tvlMetrics, error: tvlError } = useLatestTVLMetrics(symbol);

    if (cdpError || tvlError ) {
      return {
        asset: symbol,
        error: true,
      };
    }

    return {
      asset: symbol,
      collateralRatio: cdpMetrics?.collateralRatio,
      rewardFrequency: "Daily",
      deposits: tvlMetrics?.totalXlmLocked,
      minted: tvlMetrics?.totalXassetsMinted,
      marketCap: tvlMetrics?.totalXassetsMintedUSD,
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
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      {/* Top Metrics Grid */}
      <Grid container spacing={3} mb={4} className="metric-card-grid" id="metric-cards"
        sx={{
          margin: 0,
          width: 1,
          gap: '20px'
        }}
      >
        {topMetrics.map((metric, index) => (
          <Grid item xs={12} md={3} key={index} className="metric-card-container">
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
      <Paper component={Box} sx={{ p: 2, mb:2 }}>
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
      <TableContainer component={Paper} sx={{ border: 5, borderColor: theme.palette.background.paper, borderRadius: 10 }}>
        <Table>
          <TableHead sx={{ borderBottom: 1, borderColor: theme.palette.text.secondary }}>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell>Total Minted</TableCell>
              <TableCell>SP Deposits</TableCell>
              <TableCell>SP Deposits USD</TableCell>
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
                    <TableCell>{formatCurrency(row.minted!, 7, 2, row.asset)}</TableCell>
                    <TableCell>{formatCurrency(row.deposits!, 7, 2, "XLM")}</TableCell>
                    <TableCell>{formatCurrency(row.tvl!, 14, 2, "USD")}</TableCell>
                    <TableCell>{formatCurrency(row.marketCap!, 14, 2, "USD")}</TableCell> 
                    <TableCell>
                      <Typography
                        variant="button"
                        component={Link}
                        to={`/cdps/${row.asset}`}
                        sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          cursor: "pointer",
                          textDecoration: "none",
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
            bgcolor: theme.palette.background.default,
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
