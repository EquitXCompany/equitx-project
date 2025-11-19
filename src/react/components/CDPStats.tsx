import { Box, Paper, Typography, Grid, Tabs, Tab, Grid2 } from "@mui/material";
import { StatCard } from "./common/StatCard";
import { formatCurrency, generateAssetColors } from "../../utils/formatters";
import { DataGrid } from "@mui/x-data-grid";
import {
  convertContractCDPtoClientCDP,
  useCdps,
  useContractCdpForAllAssets,
} from "../hooks/useCdps";
import { PieChart } from "@mui/x-charts";
import { useLatestTVLMetricsForAllAssets } from "../hooks/useTvlMetrics";
import { CDPMetricsData, TVLMetricsData } from "../hooks/types";
import { UseQueryResult } from "react-query";
import { useLatestCdpMetricsForAllAssets } from "../hooks/useCdpMetrics";
import { StackedHistogram } from "./charts/StackedHistogram";
import { LiquidationsHistory } from "./LiquidationsHistory";
import { useAllStabilityPoolMetadata } from "../hooks/useStabilityPoolMetadata";
import BigNumber from "bignumber.js";
import { useMemo, useState } from "react";
import { useLiquidations } from "../hooks/useLiquidations";
import { useWallet } from "../../wallet";
import ErrorMessage from "../components/errorMessage";
import { useAssets } from "../hooks/useAssets";
import { useContractMapping } from "../../contexts/ContractMappingContext";
import { getContractAddress } from "../../contracts/util";
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function CDPStats() {
  const contractMapping = useContractMapping();
  const [tabValue, setTabValue] = useState(0);
  const { account } = useWallet();
  const { data: cdps, isLoading: cdpsLoading } = useCdps();
  const { data: stabilityPoolData, isLoading: spLoading } =
    useAllStabilityPoolMetadata(contractMapping);
  const { data: assets } = useAssets();
  const TVLMetricsResults = useLatestTVLMetricsForAllAssets(contractMapping);
  const cdpMetricsResults = useLatestCdpMetricsForAllAssets(contractMapping);
  const { data: liquidations, isLoading: liquidationsLoading } =
    useLiquidations();
  const {
    data: userCdpsMap,
    isLoading: userCdpsLoading,
    error: userCdpsError,
  } = useContractCdpForAllAssets(account || "", contractMapping, {
    enabled: !!account,
  });
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  // Wait for stability pool data to be loaded before processing CDPs
  const enrichedCdps = useMemo(() => {
    if (spLoading || !cdps || !stabilityPoolData) return [];
    return cdps.map((cdp) => {
      const spMetadata = stabilityPoolData[cdp.asset.symbol];
      if (!spMetadata) return cdp;
      const collateralXLM = new BigNumber(cdp.xlm_deposited);
      const debtAsset = new BigNumber(cdp.asset_lent);
      const debtValueXLM = debtAsset
        .times(spMetadata.lastpriceAsset)
        .div(spMetadata.lastpriceXLM);

      const collateralRatio = collateralXLM.div(debtValueXLM).times(100);
      const netValue = collateralXLM.minus(debtValueXLM);
      const minRatio = new BigNumber(spMetadata.min_ratio).div(1e4);
      const liquidationPriceXLM = collateralXLM.div(debtAsset).div(minRatio);
      return {
        ...cdp,
        asset_symbol: cdp.asset.symbol,
        collateralRatio: collateralRatio.toNumber(),
        collateralXLM: formatCurrency(collateralXLM, 7, 2, "XLM"),
        debtAsset: formatCurrency(debtAsset, 7, 2, cdp.asset.symbol),
        debtValueXLM: formatCurrency(debtValueXLM, 7, 2, "XLM"),
        netValue: formatCurrency(netValue, 7, 2, "XLM"),
        liquidationPriceXLM: formatCurrency(liquidationPriceXLM, 0, 2, "XLM"),
      };
    });
  }, [cdps, stabilityPoolData, spLoading]);

  const enrichedUserCdps = useMemo(() => {
    if (!userCdpsMap || !stabilityPoolData) return [];

    return Object.entries(userCdpsMap)
      .filter(([_, cdp]) => cdp !== null) // Filter out null CDPs
      .map(([assetSymbol, contractCdp]) => {
        const contractId = getContractAddress(assetSymbol, contractMapping);
        const asset = assets?.find((v) => v.symbol === assetSymbol);
        if (!asset) return null;
        const cdp = convertContractCDPtoClientCDP(
          contractCdp!,
          asset,
          contractId,
        );
        const spMetadata = stabilityPoolData[assetSymbol];
        if (!spMetadata || !cdp) return null;

        const collateralXLM = cdp.xlm_deposited;
        const debtAsset = cdp.asset_lent;
        const debtValueXLM = debtAsset
          .times(spMetadata.lastpriceAsset)
          .div(spMetadata.lastpriceXLM);

        const collateralRatio = collateralXLM.div(debtValueXLM).times(100);
        const netValue = collateralXLM.minus(debtValueXLM);
        const minRatio = new BigNumber(spMetadata.min_ratio).div(1e4);
        const liquidationPriceXLM = collateralXLM.div(debtAsset).div(minRatio);

        return {
          ...cdp,
          asset_symbol: assetSymbol,
          collateralRatio: collateralRatio.toNumber(),
          collateralXLM: formatCurrency(collateralXLM, 7, 2, "XLM"),
          debtAsset: formatCurrency(debtAsset, 7, 2, assetSymbol),
          debtValueXLM: formatCurrency(debtValueXLM, 7, 2, "XLM"),
          netValue: formatCurrency(netValue, 7, 2, "XLM"),
          liquidationPriceXLM: formatCurrency(liquidationPriceXLM, 0, 2, "XLM"),
          contract_id: cdp.contract_id,
          lender: cdp.lender,
        };
      })
      .filter((cdp): cdp is NonNullable<typeof cdp> => cdp !== null);
  }, [userCdpsMap, stabilityPoolData, assets]);

  const enrichedLiquidations = useMemo(() => {
    if (liquidationsLoading || !liquidations || !stabilityPoolData) return [];

    return liquidations.map((liquidation) => {
      const spMetadata = stabilityPoolData[liquidation.asset];
      if (!spMetadata) return liquidation;

      const collateralLiquidated = new BigNumber(
        liquidation.collateralLiquidated,
      );
      const principalRepaid = new BigNumber(liquidation.principalRepaid);
      const xlmPrice = liquidation.xlmPrice;
      const xAssetPrice = liquidation.xassetPrice.div(liquidation.xlmPrice);

      return {
        ...liquidation,
        asset: liquidation.asset,
        collateralLiquidated: formatCurrency(collateralLiquidated, 7, 6, "XLM"),
        principalRepaid: formatCurrency(
          principalRepaid,
          7,
          6,
          liquidation.asset,
        ),
        interest: formatCurrency(
          liquidation.collateralAppliedToInterest,
          7,
          6,
          "XLM",
        ),
        xlmPrice: formatCurrency(xlmPrice, 14, 6, "USD"),
        xAssetPrice: formatCurrency(xAssetPrice, 0, 6, "XLM"),
        timestamp: new Date(liquidation.timestamp).toLocaleString(),
      };
    });
  }, [liquidations, liquidationsLoading, stabilityPoolData]);

  // Calculate system-wide metrics
  const systemMetrics = useMemo(() => {
    // Default state when loading
    const defaultMetrics = {
      totalActiveCdps: 0,
      totalCollateralXlm: new BigNumber(0),
      totalDebtValueXlm: new BigNumber(0),
      totalOutstandingInterestXlm: new BigNumber(0),
      systemCollateralRatio: 0,
    };

    // Check if metrics data is available
    const loadedCdpMetrics = cdpMetricsResults.filter(
      (result) => result.isSuccess && result.data,
    );

    const loadedTvlMetrics = TVLMetricsResults.filter(
      (result) => result.isSuccess && result.data,
    );

    if (loadedCdpMetrics.length === 0 || loadedTvlMetrics.length === 0) {
      return defaultMetrics;
    }

    // Aggregate metrics across all assets
    let totalActiveCdps = 0;
    let totalCollateralXlm = new BigNumber(0);
    let totalDebtValueXlm = new BigNumber(0);
    let totalOutstandingInterestXlm = new BigNumber(0);

    // Create a map for easier access to TVL data by asset
    const tvlDataByAsset = loadedTvlMetrics.reduce(
      (acc, result) => {
        if (result.data) {
          acc[result.data.asset] = result.data;
        }
        return acc;
      },
      {} as Record<string, TVLMetricsData>,
    );

    loadedCdpMetrics.forEach((result) => {
      if (!result.data) return;

      const metrics = result.data;
      const asset = metrics.asset;
      const tvlData = tvlDataByAsset[asset];

      // Skip if TVL data for this asset is not available
      if (!tvlData) return;

      totalActiveCdps += metrics.totalCDPs;
      totalCollateralXlm = totalCollateralXlm.plus(metrics.totalXLMLocked);
      totalOutstandingInterestXlm = totalOutstandingInterestXlm.plus(
        metrics.interestMetrics.totalOutstandingInterest,
      );

      // Use stabilityPool data to convert xAssetsMinted to XLM value
      if (stabilityPoolData && stabilityPoolData[asset]) {
        const spMetadata = stabilityPoolData[asset];
        const debtValueXLM = tvlData.totalXassetsMinted
          .times(spMetadata.lastpriceAsset)
          .div(spMetadata.lastpriceXLM);

        totalDebtValueXlm = totalDebtValueXlm.plus(debtValueXLM);
      }
    });

    const systemCollateralRatio = totalDebtValueXlm.isGreaterThan(0)
      ? totalCollateralXlm.div(totalDebtValueXlm).times(100).toNumber()
      : 0;

    return {
      totalActiveCdps,
      totalCollateralXlm,
      totalDebtValueXlm,
      totalOutstandingInterestXlm,
      systemCollateralRatio,
    };
  }, [cdpMetricsResults, TVLMetricsResults, stabilityPoolData]);

  const assetSymbols = Object.keys(contractMapping);
  const assetColors = generateAssetColors(assetSymbols);

  const piChartData:
    | {
        id: number;
        value: number;
        label: string;
        backgroundColor: (string | undefined)[];
      }[]
    | [] = !TVLMetricsResults.some((result) => result.isLoading)
    ? TVLMetricsResults.map((result: UseQueryResult, idx) => {
        const backgroundColor = assetSymbols.map((asset) => assetColors[asset]);
        return {
          id: idx,
          value: (result?.data as TVLMetricsData).totalXlmLocked
            .div(1e7)
            .toNumber(),
          label: (result?.data as TVLMetricsData).asset,
          backgroundColor,
          color: backgroundColor[idx],
        };
      })
    : [];

  const cdpColumns = [
    {
      field: "asset_symbol",
      headerName: "xAsset",
      width: 100,
    },
    {
      field: "collateralRatio",
      headerName: "Collateral Ratio",
      width: 130,
      valueFormatter: (value: number) => {
        return `${value}%`;
      },
    },
    {
      field: "collateralXLM",
      headerName: "Collateral (XLM)",
      width: 130,
    },
    {
      field: "debtAsset",
      headerName: "Debt (xAsset)",
      width: 130,
    },
    {
      field: "debtValueXLM",
      headerName: "Debt Value (XLM)",
      width: 130,
    },
    {
      field: "netValue",
      headerName: "Net Value (XLM)",
      width: 130,
    },
    {
      field: "liquidationPriceXLM",
      headerName: "Liquidation Price (XLM)",
      width: 160,
    },
    { field: "status", headerName: "Status", width: 120 },
  ];

  const liquidationColumns = [
    {
      field: "asset",
      headerName: "xAsset",
      width: 100,
    },
    {
      field: "collateralLiquidated",
      headerName: "Collateral Liquidated (XLM)",
      width: 200,
    },
    {
      field: "principalRepaid",
      headerName: "Debt Burned",
      width: 180,
    },
    {
      field: "xAssetPrice",
      headerName: "Oracle Price",
      width: 150,
    },
    {
      field: "xlmPrice",
      headerName: "XLM Price",
      width: 150,
    },
    {
      field: "interest",
      headerName: "Interest Collected",
      width: 150,
    },
    {
      field: "timestamp",
      headerName: "Liquidated At",
      width: 180,
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* System-wide metrics summary */}
      <Paper
        sx={{
          mb: 4,
          p: 2,
          display: "grid",
          justifyItems: "start",
          borderRadius: 10,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            ml: 4,
            mt: 5,
            mb: 0,
            fontWeight: "bold",
            fontSize: 40,
          }}
        >
          CDP STATISTICS
        </Typography>
        <Grid
          container
          spacing={3}
          mb={4}
          className="metric-card-grid"
          id="cdp-cards"
          sx={{
            display: "flex",
            justifyContent: "space-around",
            margin: 0,
            width: 1,
            gap: "20px",
          }}
        >
          <StatCard title="Active CDPs" value={systemMetrics.totalActiveCdps} />
          <StatCard
            title="System Collateral Ratio"
            value={`${systemMetrics.systemCollateralRatio.toFixed(2)}%`}
          />
          <StatCard
            title="Total Collateral"
            value={formatCurrency(
              systemMetrics.totalCollateralXlm,
              7,
              2,
              "XLM",
            )}
          />
          <StatCard
            title="Total Debt Value"
            value={formatCurrency(systemMetrics.totalDebtValueXlm, 7, 2, "XLM")}
          />
          <StatCard
            title="Outstanding Interest"
            value={formatCurrency(
              systemMetrics.totalOutstandingInterestXlm,
              7,
              2,
              "XLM",
            )}
          />
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            XLM locked by asset
          </Typography>

          <Paper sx={{ minHeight: "400px", width: "100%" }}>
            {!TVLMetricsResults.some((result) => result.isLoading) && (
              <Box sx={{ width: "100%", height: "350px" }}>
                <PieChart
                  sx={{ margin: "52px" }}
                  series={[
                    {
                      data: piChartData,
                      innerRadius: "66%",
                      paddingAngle: 0,
                      cx: "62%",
                    },
                  ]}
                  slotProps={{ legend: { hidden: true } }}
                ></PieChart>
              </Box>
            )}
            <Grid2
              container
              spacing={4}
              justifyContent="center"
              pb="10px"
              px="50px"
            >
              {piChartData.map(({ backgroundColor, label }, idx) => {
                return (
                  <Grid2
                    display="flex"
                    justifyContent="center"
                    width={"20%"}
                    key={idx}
                  >
                    <Box
                      sx={{
                        width: "25px",
                        height: "24px",
                        backgroundColor: backgroundColor[idx],
                        display: "inline-block",
                        margin: 0.5,
                      }}
                    ></Box>
                    {label}
                  </Grid2>
                );
              })}
            </Grid2>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Collateral Ratio Distribution
          </Typography>

          {!cdpMetricsResults.some((result) => result.isLoading) && (
            <Paper>
              <StackedHistogram
                data={Object.keys(contractMapping).reduce(
                  (acc, asset) => {
                    const result = cdpMetricsResults.find(
                      (r) => r.data?.asset === asset,
                    );
                    if (result?.data) {
                      acc[asset] = result.data.collateralRatioHistogram;
                    }
                    return acc;
                  },
                  {} as Record<
                    string,
                    CDPMetricsData["collateralRatioHistogram"]
                  >,
                )}
                isLoading={cdpMetricsResults.some((result) => result.isLoading)}
                normalize={1e7}
              />
            </Paper>
          )}
        </Grid>
      </Grid>

      <LiquidationsHistory />

      <Paper sx={{ mt: 4, width: "100%" }}>
        <Box>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="CDP and Liquidations tabs"
          >
            <Tab label="Active CDPs" id="tab-0" />
            <Tab label="Your CDPs" id="tab-1" />
            <Tab label="Liquidations" id="tab-2" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {enrichedCdps && enrichedCdps.length > 0 && (
            <Box sx={{ height: 600, width: "100%" }}>
              <DataGrid
                rows={enrichedCdps}
                columns={cdpColumns}
                loading={cdpsLoading || spLoading}
                getRowId={(row) => `${row.contract_id}-${row.lender}`}
                pageSizeOptions={[10, 25, 50]}
              />
            </Box>
          )}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {!account ? (
            <ErrorMessage
              title="Wallet Not Connected"
              message="Please connect your wallet to view your CDPs."
            />
          ) : userCdpsLoading ? (
            <Box sx={{ p: 2 }}>
              <Typography>Loading your CDPs...</Typography>
            </Box>
          ) : userCdpsError ? (
            <ErrorMessage
              title="Error Loading CDPs"
              message={userCdpsError.message}
            />
          ) : (
            <Box sx={{ height: 600, width: "100%" }}>
              {enrichedUserCdps.length === 0 ? (
                <Typography sx={{ p: 2 }}>
                  You don't have any active CDPs.
                </Typography>
              ) : (
                <DataGrid
                  rows={enrichedUserCdps}
                  columns={cdpColumns}
                  loading={userCdpsLoading || spLoading}
                  getRowId={(row) => `${row.contract_id}-${row.lender}`}
                  pageSizeOptions={[10, 25, 50]}
                />
              )}
            </Box>
          )}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={enrichedLiquidations}
              columns={liquidationColumns}
              loading={liquidationsLoading}
              getRowId={(row) =>
                `${row.cdpId}-${row.timestamp.toLocaleString()}`
              }
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                sorting: {
                  sortModel: [{ field: "timestamp", sort: "desc" }],
                },
              }}
            />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
