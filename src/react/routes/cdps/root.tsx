import { Outlet, useNavigate } from "react-router-dom";
import { Box, Typography, Grid, Paper, Container, Button } from '@mui/material';
import AddressDisplay from '../../components/cdp/AddressDisplay';
import Connect from "../../components/connect";
import { useStabilityPoolMetadata } from '../../hooks/useStabilityPoolMetadata';
import BigNumber from "bignumber.js";
import { BASIS_POINTS } from "../../../constants";

function Root() {
  const { data: stabilityData, error, isLoading } = useStabilityPoolMetadata();
  const navigate = useNavigate();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;
  if (!stabilityData) return <div>No data available</div>;

  const { lastpriceXLM, lastpriceAsset, min_ratio, symbolAsset, contractId } = stabilityData;

  const handleStabilityPoolClick = () => {
    navigate(`/stability-pool/${contractId}`);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          XLM↔USD Pool
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
      </Box>
      <Connect />
      <Outlet />
    </Container>
  );
}

export const element = <Root />;