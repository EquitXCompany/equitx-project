import {
  Alert,
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BigNumber from "bignumber.js";
import { TVLChart } from "./charts/TVLChart";
import { useLatestCdpMetrics } from "../hooks/useCdpMetrics";
import {
  useLatestTVLMetrics,
  useTVLMetricsHistory,
} from "../hooks/useTvlMetrics";
import { formatCurrency } from "../../utils/formatters";

interface AssetAccordionProps {
  asset: string;
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  dateParams: { start_time: string; end_time: string };
}

export function AssetAccordion({
  asset,
  expanded,
  onChange,
  dateParams,
}: AssetAccordionProps) {
  const theme = useTheme();

  const cdpQuery = useLatestCdpMetrics(asset);
  const tvlQuery = useLatestTVLMetrics(asset);
  const { data: assetHistory, isLoading: assetHistoryLoading } =
    useTVLMetricsHistory(asset, dateParams, {
      enabled: expanded, // Only fetch when expanded
    });

  let metrics = (
    <Typography variant="caption" color="textDisabled">
      Loading Asset...
    </Typography>
  );
  let collateralRatio = new BigNumber(0);
  let deposits = new BigNumber(0);
  let minted = new BigNumber(0);

  if (cdpQuery.isSuccess && tvlQuery.isSuccess) {
    collateralRatio = cdpQuery.data.collateralRatio;
    const marketCap = tvlQuery.data.totalXassetsMintedUSD;
    const tvl = tvlQuery.data.tvlUSD;
    deposits = tvlQuery.data.totalXlmLocked;
    minted = tvlQuery.data.totalXassetsMinted;

    metrics = (
      <Box
        sx={{
          display: "flex",
          gap: 3,
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            TVL
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(tvl, 14, 2, "USD")}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Market Cap
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(marketCap, 14, 2, "USD")}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Protocol Share
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {collateralRatio
              ? `${formatCurrency(collateralRatio, 0, 2, "%")}`
              : "N/A"}
          </Typography>
        </Box>
      </Box>
    );
  } else if (cdpQuery.isError || tvlQuery.isError) {
    metrics = (
      <Alert severity="error" key={asset} sx={{ mb: 2 }}>
        Failed to load data for {asset}
      </Alert>
    );
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={onChange}
      sx={{
        mb: "var(--spacing-lg)",
        borderRadius: "var(--radius-md) !important",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 64 }}
        slotProps={{
          content: {
            sx: {
              alignItems: "center",
              pr: 2,
              m: "20px 0",
            },
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, flexGrow: 1, marginBottom: 0 }}
        >
          {asset}
        </Typography>
        {metrics}
      </AccordionSummary>
      <AccordionDetails
        sx={{
          pt: 3,
          pb: 4,
          px: 3,
        }}
      >
        {/* Supply over time chart */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: "var(--radius-md)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Supply over time
            </Typography>
            {/* Simplified time selector - could be enhanced later */}
            <Typography variant="caption" color="text.secondary">
              30d
            </Typography>
          </Box>
          <TVLChart
            data={assetHistory || []}
            type="asset"
            assetSymbol={asset}
            isLoading={assetHistoryLoading}
            showTitle={false}
          />
        </Paper>

        {/* Two-column layout: Collateralization and Stability Pools */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                borderRadius: "var(--radius-md)",
                height: "100%",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Collateralization
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Collateral Locked
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatCurrency(deposits, 7, 2, "XLM")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Debt Minted
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatCurrency(minted, 7, 2, asset)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Global Ratio
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {collateralRatio
                      ? formatCurrency(collateralRatio, 0, 2, "%")
                      : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                borderRadius: "var(--radius-md)",
                height: "100%",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Stability Pools
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Deposited
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatCurrency(minted, 7, 2, asset)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    APY
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {/* Placeholder - real APY data not available in current hooks */}
                    11%
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}
