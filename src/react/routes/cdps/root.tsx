import { Link, Outlet, useParams } from "react-router-dom";
import { Box, Typography, Grid, Button } from "@mui/material";
import ErrorMessage from "../../components/errorMessage";
import { useContractMapping } from "../../../contexts/ContractMappingContext";

export function Root() {
  const { assetSymbol } = useParams();
  const contractMapping = useContractMapping();

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  return (
    <>
      <Box sx={{ my: 4 }}>
        <Grid container sx={{ alignItems: "center", mb: 4 }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{ textAlign: "left", m: 0 }}
          >
            XLM↔{assetSymbol} Pool
          </Typography>

          <Button
            component={Link}
            variant="outlined"
            color="primary"
            to={`/stability-pool/${assetSymbol}`}
            sx={{ ml: 4 }}
          >
            View Stability Pool
          </Button>
        </Grid>
      </Box>

      <Outlet />
    </>
  );
}
