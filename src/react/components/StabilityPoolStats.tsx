import {
  Box,
  Grid,
  Paper,
  Typography,
  Skeleton,
  Alert,
  CircularProgress,
  Button,
} from "@mui/material";
import { useAllStabilityPoolMetadata } from "../hooks/useStabilityPoolMetadata";
import { useLatestTVLMetricsForAllAssets } from "../hooks/useTvlMetrics";
import { useWallet } from "../../wallet";
import { useStakersByAddress } from "../hooks/useStakers";
import BigNumber from "bignumber.js";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { StackedHistogram } from "./charts/StackedHistogram";
import { TVLMetricsData } from "../hooks/types";
import { formatCurrency, generateAssetColors } from "../../utils/formatters";
import { Link } from "react-router-dom";
import { useContractMapping } from "../../contexts/ContractMappingContext";

ChartJS.register(ArcElement, Tooltip, Legend);

const LoadingSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="60%" height={32} />
    <Skeleton variant="text" width="40%" />
    <Skeleton variant="text" width="40%" />
  </Box>
);

const ErrorDisplay = ({ message }: { message: string }) => (
  <Alert severity="error" sx={{ mb: 2 }}>
    {message}
  </Alert>
);

export default function StabilityPoolStats() {
  const contractMapping = useContractMapping();
  const {
    data: stabilityPoolData,
    isLoading: isStabilityLoading,
    error: stabilityError,
  } = useAllStabilityPoolMetadata(contractMapping);

  const tvlMetricsResults = useLatestTVLMetricsForAllAssets(contractMapping);
  const isLoading =
    tvlMetricsResults.some((result) => result.isLoading) || isStabilityLoading;
  const hasError =
    tvlMetricsResults.some((result) => result.error) || stabilityError;

  const { account, isSignedIn } = useWallet();

  const {
    data: userStakes,
    isLoading: isUserStakesLoading,
    error: userStakesError,
  } = useStakersByAddress(account ?? "");

  if (hasError) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay message="Failed to load stability pool data. Please try again later." />
      </Box>
    );
  }

  const totalValueXLM = !isLoading
    ? tvlMetricsResults.reduce((total, result) => {
        if (!result.data) return total;
        const asset = result.data.asset;
        const assetStabilityData = stabilityPoolData?.[asset];
        if (!assetStabilityData) return total;

        return total.plus(
          result.data.totalXassetsStakedUSD.div(
            assetStabilityData.lastpriceXLM,
          ),
        );
      }, new BigNumber(0))
    : new BigNumber(0);

  const assets = Object.keys(contractMapping);
  const assetColors = generateAssetColors(assets);

  const distributionData = {
    labels: assets,
    datasets: [
      {
        data: tvlMetricsResults.map((result) => {
          if (!result.data || isLoading) return 0;
          const asset = result.data.asset;
          const assetStabilityData = stabilityPoolData?.[asset];
          if (!assetStabilityData) return 0;

          return result.data.totalXassetsStakedUSD
            .div(assetStabilityData.lastpriceXLM)
            .div(1e14)
            .toNumber();
        }),
        backgroundColor: assets.map((asset) => assetColors[asset]),
      },
    ],
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        pb: 4,
      }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              borderRadius: "var(--radius-md)",
            }}
          >
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <Typography variant="subtitle2" color="textSecondary">
                  Total
                </Typography>
                <Typography variant="body2">
                  Open Accounts:{" "}
                  {tvlMetricsResults.reduce(
                    (sum, result) => sum + (result.data?.openAccounts || 0),
                    0,
                  )}
                </Typography>
                <Typography variant="body2">
                  XLM Value: {formatCurrency(totalValueXLM, 14, 2, "XLM")}
                </Typography>
              </>
            )}
          </Paper>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Value Distribution
            </Typography>
            <Box
              sx={{
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isLoading ? (
                <CircularProgress />
              ) : (
                <Doughnut
                  data={distributionData}
                  options={{
                    cutout: "70%",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const value = context.raw as number;
                            return `${value.toLocaleString()} XLM`;
                          },
                        },
                      },
                    },
                  }}
                />
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              minHeight: "400px",
              display: "flex",
              flexDirection: "column",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Typography variant="subtitle2" color="textSecondary">
              Staked Share Value
            </Typography>
            <Box
              sx={{
                flex: 1, // Take remaining space
                minHeight: 0, // Allow box to shrink
                position: "relative",
              }}
            >
              {isLoading ? (
                <CircularProgress />
              ) : (
                !tvlMetricsResults.some((result) => result.isLoading) && (
                  <StackedHistogram
                    data={Object.keys(contractMapping).reduce(
                      (acc, asset) => {
                        const result = tvlMetricsResults.find(
                          (r) => r.data?.asset === asset,
                        );
                        const assetStabilityData = stabilityPoolData?.[asset];
                        if (result?.data && assetStabilityData) {
                          const histogram = result.data.stakedShareHistogram;
                          const convertedHistogram = {
                            ...histogram,
                            buckets: histogram.buckets.map((bucket) =>
                              bucket
                                .multipliedBy(assetStabilityData.lastpriceAsset)
                                .div(assetStabilityData.lastpriceXLM),
                            ),
                          };
                          acc[asset] = convertedHistogram;
                        }
                        return acc;
                      },
                      {} as Record<
                        string,
                        TVLMetricsData["stakedShareHistogram"]
                      >,
                    )}
                    isLoading={tvlMetricsResults.some(
                      (result) => result.isLoading,
                    )}
                    normalize={1e7}
                  />
                )
              )}
            </Box>
          </Paper>
        </Grid>
        {Object.entries(contractMapping).map(([symbol]) => {
          const tvlMetrics = tvlMetricsResults.find(
            (result) => result.data?.asset === symbol,
          )?.data;
          const stabilityMetadata = stabilityPoolData?.[symbol];
          const userStake = userStakes?.find(
            (stake) => stake.asset.symbol === symbol,
          );

          return (
            <Grid item xs={12} md={6} key={symbol}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: "var(--radius-md)",
                }}
              >
                {isLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6">{symbol}</Typography>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Staked:{" "}
                        {formatCurrency(
                          tvlMetrics?.totalXassetsStaked || "0",
                          7,
                          3,
                          symbol,
                        )}
                      </Typography>
                      <Typography variant="body2">
                        Staked Value:{" "}
                        {formatCurrency(
                          tvlMetrics?.totalXassetsStakedUSD.div(
                            stabilityMetadata?.lastpriceXLM || BigNumber(1),
                          ) || BigNumber(0),
                          14,
                          2,
                          "XLM",
                        )}
                      </Typography>
                      <Typography variant="body2">
                        Open Accounts: {tvlMetrics?.openAccounts || 0}
                      </Typography>
                    </Box>

                    {isSignedIn && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">My Account</Typography>
                        {isUserStakesLoading ? (
                          <LoadingSkeleton />
                        ) : userStakesError ? (
                          <ErrorDisplay message="Failed to load user stakes" />
                        ) : (
                          <>
                            <Typography variant="body2">
                              Staked:{" "}
                              {formatCurrency(
                                userStake?.xasset_deposit || new BigNumber(0),
                                7,
                                2,
                                symbol,
                              )}
                            </Typography>
                            <Typography variant="body2">
                              Staked Share:{" "}
                              {userStake?.xasset_deposit
                                .div(tvlMetrics?.totalXassetsStaked || 1)
                                .multipliedBy(100)
                                .toFormat(2) || "0.00"}
                              %
                            </Typography>
                          </>
                        )}
                      </Box>
                    )}

                    <Box
                      sx={{ mt: 2, display: "flex", justifyContent: "center" }}
                    >
                      <Button
                        component={Link}
                        to={`/stability-pool/${symbol}`}
                        variant="outlined"
                        size="small"
                      >
                        Go to Stability Pool
                      </Button>
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
