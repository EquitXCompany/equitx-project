import { useMemo, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  TrendingUp,
  Percent,
  HandshakeOutlined,
  AttachMoney,
} from "@mui/icons-material";
import {
  useLatestProtocolStats,
  useProtocolStatsHistory,
} from "../hooks/useProtocolStats";
import { MetricCard } from "./common/MetricCard";
import { TVLChart } from "./charts/TVLChart";
import { AssetAccordion } from "./AssetAccordion";
import { formatCurrency } from "../../utils/formatters";
import { useContractMapping } from "../../contexts/ContractMappingContext";

const metricIcons = [
  AttachMoney,
  TrendingUp,
  HandshakeOutlined,
  Percent,
] as const;

export default function Dashboard() {
  const theme = useTheme();
  const contractMapping = useContractMapping();
  const assetSymbols = Object.keys(contractMapping);
  const [expandedAsset, setExpandedAsset] = useState<string | false>(false);

  const dateParams = useMemo(
    () => ({
      start_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date().toISOString(),
    }),
    [],
  );

  const {
    data: protocolStats,
    isLoading: statsLoading,
    error: statsError,
  } = useLatestProtocolStats();

  const {
    data: statsHistory,
    isLoading: historyLoading,
    error: historyError,
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
    },
  ];

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
    <Box
      sx={{
        bgcolor: theme.palette.background.default,
        pb: 4,
      }}
    >
      {/* Top Metrics Grid */}
      <Grid
        container
        id="metric-cards"
        sx={{
          justifyContent: "space-between",
          m: "0 0 var(--spacing-lg)",
          p: 0,
          width: 1,
          gap: "var(--spacing-lg)",
        }}
      >
        {topMetrics.map((metric, index) => (
          <Grid item xs={12} md={3} key={index} className="metric-card">
            <MetricCard
              icon={metricIcons[index]}
              title={metric.title}
              value={metric.format(metric.value)}
              isLoading={statsLoading}
            />
          </Grid>
        ))}
      </Grid>

      {/* TVL Chart */}
      <Paper
        component={Box}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: "var(--radius-md)",
        }}
      >
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

      {/* Asset Details Accordions */}
      <Box sx={{ mb: 4 }}>
        {assetSymbols.map((asset) => {
          const handleAccordionChange =
            (selection: string) =>
            (_event: React.SyntheticEvent, isExpanded: boolean) => {
              setExpandedAsset(isExpanded ? selection : false);
            };

          return (
            <AssetAccordion
              key={asset}
              asset={asset}
              expanded={expandedAsset === asset}
              onChange={handleAccordionChange(asset)}
              dateParams={dateParams}
            />
          );
        })}
      </Box>

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
