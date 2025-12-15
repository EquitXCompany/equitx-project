import { useMemo } from "react";
import { Typography, Grid2, Paper } from "@mui/material";
import { useParams } from "react-router-dom";
import BigNumber from "bignumber.js";
import { BASIS_POINTS } from "../../../constants";
import PriceHistoryChart from "../../components/charts/PriceHistoryChart";
import { formatCurrency } from "../../../utils/formatters";
import {
  CalculateCollateralizationRatio,
  useMergedCdps,
} from "../../hooks/useCdps";
import Card from "../../components/card";
import { useWallet } from "../../../wallet";
import { useTheme } from "../../../contexts/ThemeContext";
import { useContractMapping } from "../../../contexts/ContractMappingContext";
import { NewCdp } from "./new";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { useLatestCdpMetrics } from "../../hooks/useCdpMetrics";
import { useLatestTVLMetrics } from "../../hooks/useTvlMetrics";
import { getStatusColor } from "../../../utils/contractHelpers";

export function List() {
  const params = useParams();
  const { account } = useWallet();
  const { isDarkMode } = useTheme();
  const contractMapping = useContractMapping();

  // Root route will error if this is undefined
  const assetSymbol = params.assetSymbol!;

  const {
    data: assetMetrics,
    error: assetMetricsError,
    isLoading: assetMetricsLoading,
  } = useLatestCdpMetrics(assetSymbol);

  const {
    data: tvlMetrics,
    error: tvlMetricsError,
    isLoading: tvlMetricsLoading,
  } = useLatestTVLMetrics(assetSymbol);

  const {
    data: stabilityData,
    isLoading: stabilityLoading,
    error: stabilityError,
  } = useStabilityPoolMetadata(assetSymbol, contractMapping);

  const {
    data: cdps,
    isLoading: cdpsLoading,
    error: cdpsError,
  } = useMergedCdps(assetSymbol, contractMapping, account);

  let hasCdp = false;
  const sortedCdps = useMemo(
    () =>
      (cdps ?? []).sort((a, b) => {
        let s = 0;
        if (a.lender === account) s = -1;
        if (b.lender === account) s = 1;
        if (s !== 0) hasCdp = true;

        return s;
      }),
    [cdps, account],
  );

  if (cdpsLoading || stabilityLoading) return <div>Loading...</div>;
  if (cdpsError || stabilityError)
    return (
      <div>
        An error occurred: {cdpsError?.message || stabilityError?.message}
      </div>
    );
  if (!cdps || !stabilityData) return <div>No CDPs found</div>;

  const { lastpriceXLM, lastpriceAsset, min_ratio } = stabilityData;

  return (
    <>
      <Grid2 container spacing={3}>
        {/* New CDP Form */}
        {!hasCdp && (
          <Grid2 size={6}>
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h5"
                align="left"
                sx={{ color: "var(--color-primary)" }}
              >
                Mint a Synthetic Asset
              </Typography>
              <NewCdp sx={{}} />
            </Paper>
          </Grid2>
        )}

        {/* Stat Blocks */}
        <Grid2 container size={hasCdp ? "grow" : 6} columns={2} spacing={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Collateral Ratio
            </Typography>
            <Typography variant="h4">
              {assetMetricsLoading
                ? "Loading..."
                : assetMetricsError
                  ? "Error"
                  : `${assetMetrics?.collateralRatio.toFixed(4)}%`}
            </Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Market Cap USD
            </Typography>
            <Typography variant="h4">
              {tvlMetricsLoading
                ? "Loading..."
                : tvlMetricsError
                  ? "Error"
                  : `${formatCurrency(tvlMetrics?.totalXassetsMinted.multipliedBy(lastpriceAsset) || "", 7, 2, "$")}`}
            </Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Market Cap XLM
            </Typography>
            <Typography variant="h4">
              {tvlMetricsLoading
                ? "Loading..."
                : tvlMetricsError
                  ? "Error"
                  : `${formatCurrency(tvlMetrics?.totalXassetsMinted.multipliedBy(lastpriceAsset).dividedBy(lastpriceXLM) || "", 7, 2, "XLM")}`}
            </Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Total Minted
            </Typography>
            <Typography variant="h4">
              {tvlMetricsLoading
                ? "Loading..."
                : tvlMetricsError
                  ? "Error"
                  : `${formatCurrency(tvlMetrics?.totalXassetsMinted || "", 7, 2, assetSymbol)}`}
            </Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              XLM Price
            </Typography>
            <Typography variant="h4">${lastpriceXLM.toFixed(4)}</Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {assetSymbol} Price
            </Typography>
            <Typography variant="h4">${lastpriceAsset.toFixed(4)}</Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Minimum CR
            </Typography>
            <Typography variant="h4">
              {new BigNumber(min_ratio).times(100).div(BASIS_POINTS).toFixed(2)}
              %
            </Typography>
          </Paper>
        </Grid2>
      </Grid2>

      <PriceHistoryChart assetSymbol={assetSymbol} />

      <div className="grid">
        <ul
          role="list"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(24ch, 1fr))",
            gap: "2rem",
            padding: "0",
          }}
        >
          {sortedCdps.map((cdp) => (
            <Card
              key={cdp.lender}
              href={
                cdp.status.toLowerCase() === "closed"
                  ? cdp.lender === account
                    ? `/cdps/${assetSymbol}/new`
                    : ""
                  : `/cdps/${assetSymbol}/${cdp.lender}`
              }
              title={cdp.lender === account ? "yours" : cdp.lender}
            >
              <div
                style={{
                  color: getStatusColor(cdp.status, isDarkMode),
                }}
              >
                {cdp.status}
                {cdp.status.toLowerCase() !== "closed" &&
                  ` (${CalculateCollateralizationRatio(cdp, lastpriceXLM, lastpriceAsset).times(100).toFixed(1)}% collateralized)`}
                {cdp.status.toLowerCase() === "closed" &&
                  cdp.lender === account && <div>Open a new one</div>}
              </div>
            </Card>
          ))}

          {!hasCdp && (
            <Card title="New" href={`/cdps/${assetSymbol}/new`}>
              Create a CDP
            </Card>
          )}
        </ul>
      </div>
    </>
  );
}
