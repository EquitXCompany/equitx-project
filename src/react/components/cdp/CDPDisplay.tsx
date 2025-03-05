import React, { useState, useEffect } from "react";
import BigNumber from "bignumber.js";
import { Card, CardContent, Typography, Box, Grid } from "@mui/material";
import { getStatusColor } from "../../../utils/contractHelpers";
import { ContractCDP } from "../../hooks/useCdps";
import { useTheme } from "../../../contexts/ThemeContext";

interface CDPDisplayProps {
  cdp: ContractCDP;
  decimals: number;
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  symbolAsset: string;
  lender: string;
  interestRate: number;
}

export const formatNumber = (
  value: BigNumber | number,
  decimalPlaces: number
) => {
  return new BigNumber(value).toFixed(decimalPlaces);
};

const SECONDS_PER_YEAR = 31536000; // 365 days

export const CDPDisplay: React.FC<CDPDisplayProps> = ({
  cdp,
  decimals,
  symbolAsset,
  interestRate,
}) => {
  const { isDarkMode } = useTheme();
  const statusColor = getStatusColor(cdp.status.tag, isDarkMode);
  const [currentInterest, setCurrentInterest] = useState<BigNumber>(
    new BigNumber(cdp.accrued_interest.amount.toString())
  );

  useEffect(() => {
    // Calculate real-time interest update
    const updateInterest = () => {
      const lastInterestTime = new BigNumber(cdp.last_interest_time.toString());
      const currentTime = new BigNumber(Math.floor(Date.now() / 1000)); // Current time in seconds
      const timeElapsed = currentTime.minus(lastInterestTime);
      const baseInterest = new BigNumber(
        cdp.accrued_interest.amount.toString()
      );
      const newInterest = new BigNumber(cdp.asset_lent.toString())
        .times(interestRate)
        .times(timeElapsed)
        .div(SECONDS_PER_YEAR * 1e4);

      setCurrentInterest(baseInterest.plus(newInterest));
    };

    updateInterest();
    const interval = setInterval(updateInterest, 1000);
    return () => clearInterval(interval);
  }, [cdp, interestRate]);

  return (
    <Card className="cdp-display">
      <CardContent>
        <Box className={`cdp-status`} mb={2} style={{ color: statusColor }}>
          <Typography variant="h6" style={{ fontSize: "1.6rem" }}>
            Status: {cdp.status.tag}
          </Typography>
        </Box>
        <Box className="cdp-details">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box className="cdp-detail" mb={1}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ fontSize: "1.2rem" }}
                >
                  XLM Locked:
                </Typography>
                <Typography variant="body1" style={{ fontSize: "1.5rem" }}>
                  {formatNumber(
                    new BigNumber(cdp.xlm_deposited.toString()).div(
                      10 ** decimals
                    ),
                    decimals
                  )}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box className="cdp-detail" mb={1}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ fontSize: "1.2rem" }}
                >
                  {symbolAsset} Lent:
                </Typography>
                <Typography variant="body1" style={{ fontSize: "1.5rem" }}>
                  {formatNumber(
                    new BigNumber(cdp.asset_lent.toString()).div(
                      10 ** decimals
                    ),
                    decimals
                  )}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box className="cdp-detail" mb={1}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ fontSize: "1.2rem" }}
                >
                  Ratio:
                </Typography>
                <Typography variant="body1" style={{ fontSize: "1.5rem" }}>
                  {formatNumber(cdp.collateralization_ratio / 100, 2)}%
                </Typography>
              </Box>
            </Grid>

            {/* Interest information */}
            <Grid item xs={12} sm={6}>
              <Box className="cdp-detail" mb={1}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ fontSize: "1.2rem" }}
                >
                  Accrued Interest:
                </Typography>
                <Typography variant="body1" style={{ fontSize: "1.5rem" }}>
                  {formatNumber(currentInterest.div(10 ** decimals), decimals)}{" "}
                  {symbolAsset}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box className="cdp-detail" mb={1}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  style={{ fontSize: "1.2rem" }}
                >
                  Interest Paid:
                </Typography>
                <Typography variant="body1" style={{ fontSize: "1.5rem" }}>
                  {formatNumber(
                    new BigNumber(cdp.accrued_interest.paid.toString()).div(
                      10 ** decimals
                    ),
                    decimals
                  )}{" "}
                  {"XLM"}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};
