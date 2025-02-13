import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Grid, Paper, Container, Button } from '@mui/material';
import AddressDisplay from '../../components/cdp/AddressDisplay';
import Connect from "../../components/connect";
import { useStabilityPoolMetadata } from '../../hooks/useStabilityPoolMetadata';
import BigNumber from "bignumber.js";
import { BASIS_POINTS } from "../../../constants";
import { contractMapping, XAssetSymbol } from "../../../contracts/contractConfig";
import ErrorMessage from "../../components/errorMessage";
import PriceHistoryChart from '../../components/charts/PriceHistoryChart';

function Root() {
  const { assetSymbol } = useParams() as { assetSymbol: XAssetSymbol };
  const navigate = useNavigate();

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  const { data: stabilityData, error, isLoading } = useStabilityPoolMetadata(assetSymbol);
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;
  if (!stabilityData) return <div>No data available</div>;

  const { lastpriceXLM, lastpriceAsset, min_ratio, symbolAsset, contractId } = stabilityData;

  const handleStabilityPoolClick = () => {
    navigate(`/stability-pool/${assetSymbol}`);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          XLM↔{symbolAsset} Pool
        </Typography>
        <Typography variant="h5" component="h4" gutterBottom>
          <AddressDisplay address={contractId} />
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStabilityPoolClick}
          sx={{ mt: 2, mb: 3 }}
        >
          View Stability Pool
        </Button>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                XLM Price
              </Typography>
              <Typography variant="h4">
                ${lastpriceXLM.toFixed(4)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {symbolAsset} Price
              </Typography>
              <Typography variant="h4">
                ${lastpriceAsset.toFixed(4)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Minimum CR
              </Typography>
              <Typography variant="h4">
                {new BigNumber(min_ratio).times(100).div(BASIS_POINTS).toFixed(2)}%
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        <PriceHistoryChart assetSymbol={assetSymbol} />
      </Box>
      <Connect />
      <Outlet />
    </Container>
  );
}

export const element = <Root />;