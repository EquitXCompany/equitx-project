import { useLoaderData, Outlet, useNavigate } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import Connect from "../../components/connect";
import BigNumber from "bignumber.js";
import { BASIS_POINTS } from "../../../constants";
import { Box, Typography, Grid, Paper, Container, Button } from '@mui/material';
import AddressDisplay from '../../components/cdp/AddressDisplay';

interface StabilityPoolMetadata {
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  min_ratio: number;
  symbolAsset: string;
  contractId: string;
}

export const loader: LoaderFunction = async (): Promise<StabilityPoolMetadata> => {
  const tx = await xasset.minimum_collateralization_ratio();
  return {
    lastpriceXLM: new BigNumber(await xasset.lastprice_xlm().then((t) => {
      if (t.result.isOk()) {
        return t.result.unwrap().price.toString();
      } else {
        console.error(t.result);
        throw new Error("Failed to fetch XLM price");
      }
    })).div(10 ** 14),
    
    lastpriceAsset: new BigNumber(await xasset.lastprice_asset().then((t) => {
      if (t.result.isOk()) {
        return t.result.unwrap().price.toString();
      } else {
        console.error(t.result);
        throw new Error("Failed to fetch asset price");
      }
    })).div(10 ** 14),
    min_ratio: tx.result,
    symbolAsset: "xUSD",
    contractId: xasset.options.contractId,
  };
};

function Root() {
  const { lastpriceXLM, lastpriceAsset, min_ratio, symbolAsset, contractId } = useLoaderData() as StabilityPoolMetadata;
  const navigate = useNavigate();

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
