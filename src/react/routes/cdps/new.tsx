import { useEffect, useState } from "react";
import { Form, useLoaderData, redirect, useParams } from "react-router-dom";
import type { ActionFunction, LoaderFunction } from "react-router-dom";
import { useWallet } from "../../../wallet";
import { authenticatedContractCall } from "../../../utils/contractHelpers";
import BigNumber from 'bignumber.js';
import { BASIS_POINTS } from "../../../constants";
import { Box, Button, TextField, Typography } from '@mui/material';
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { contractMapping, XAssetSymbol } from "../../../contracts/contractConfig";
import ErrorMessage from "../../components/errorMessage";
import { getContractBySymbol } from "../../../contracts/util";

type LoaderData = {
  minRatio: BigNumber;
};

export const loader: LoaderFunction = async ({ params }) => {
  const assetSymbol = params.assetSymbol as XAssetSymbol;

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    throw new Error("Invalid asset symbol");
  }

  const contractClient = getContractBySymbol(assetSymbol);

  return {
    minRatio: await contractClient
      .minimum_collateralization_ratio()
      .then((t: { result: number }) => new BigNumber(t.result)),
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  const assetSymbol = params.assetSymbol as XAssetSymbol;

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    throw new Error("Invalid asset symbol");
  }

  const contractClient = await getContractBySymbol(assetSymbol);
  const formData = Object.fromEntries(await request.formData());
  const decimalsXLM = 7;
  const decimalsAsset = 7;
  const cdp = {
    lender: formData.lender as string,
    collateral: new BigNumber(formData.collateral?.toString() || '0').times(new BigNumber(10).pow(decimalsXLM)).toFixed(0),
    asset_lent: new BigNumber(formData.asset_lent?.toString() || '0').times(new BigNumber(10).pow(decimalsAsset)).toFixed(0),
  };
  await authenticatedContractCall(contractClient.open_cdp, cdp);
  return redirect(`/cdps/${assetSymbol}`);
};

function New() {
  const { assetSymbol } = useParams() as { assetSymbol: XAssetSymbol };
  const { account, isSignedIn } = useWallet();
  const { minRatio } = useLoaderData() as Awaited<LoaderData>;
  const { data: metadata, isLoading } = useStabilityPoolMetadata(assetSymbol);

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  const [collateral, setCollateral] = useState(new BigNumber(100));
  const [toLend, setToLend] = useState(new BigNumber(0));
  const [ratio, setRatio] = useState(new BigNumber(110));
  const decimalsXLM = 7;
  const decimalsAsset = 7;
  const stepValueXLM = `0.${'0'.repeat(decimalsXLM - 1)}1`;
  const stepValueAsset = `0.${'0'.repeat(decimalsAsset - 1)}1`;

  const updateRatio = (newCollateral: BigNumber, newToLend: BigNumber) => {
    if (newToLend.isZero() || !metadata) {
      setRatio(new BigNumber(0));
    } else {
      const newRatio = newCollateral.times(metadata.lastpriceXLM).times(BASIS_POINTS).div(newToLend.times(metadata.lastpriceAsset));
      setRatio(newRatio);
    }
  };

  const handleCollateralChange = (value: string) => {
    const newCollateral = new BigNumber(value);
    setCollateral(newCollateral);
    updateRatio(newCollateral, toLend);
  };

  const handleToLendChange = (value: string) => {
    const newToLend = new BigNumber(value);
    setToLend(newToLend);
    updateRatio(collateral, newToLend);
  };

  const handleRatioChange = (value: string) => {
    if (!metadata) return;
    const valTo2Decimals = parseFloat(value).toFixed(2);
    const newRatio = new BigNumber(valTo2Decimals).times(BASIS_POINTS).div(100);
    setRatio(newRatio);
    const newToLend = collateral.times(metadata.lastpriceXLM).times(BASIS_POINTS).div(newRatio).div(metadata.lastpriceAsset);
    setToLend(newToLend.decimalPlaces(decimalsAsset, BigNumber.ROUND_HALF_EVEN));
  };

  const displayRatio = ratio.isGreaterThan(0) ? ratio.times(100).div(BASIS_POINTS).toFixed(2) : 0;
  const ratioBelowMinimum = ratio.isLessThan(minRatio);

  useEffect(() => {
    updateRatio(collateral, toLend);
  }, [metadata]);

  if (isLoading || !metadata) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Open a new Collateralized Debt Position (CDP)
      </Typography>
      <Form method="post" className="text-sm flex flex-col text-left">
        <input type="hidden" name="lender" value={account} />
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="How much XLM to deposit?"
            type="number"
            name="collateral"
            autoFocus
            value={collateral.toNumber()}
            onChange={(e) => handleCollateralChange(e.target.value)}
            inputProps={{ step: stepValueXLM }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Box sx={{ mt: 2 }} className="">
          <TextField
            fullWidth
            label="Set collateralization ratio (%)"
            type="number"
            error={ratioBelowMinimum}
            helperText={ratioBelowMinimum ? "Ratio below minimum collateralization" : ""}
            value={ratio.times(100).div(BASIS_POINTS)}
            onChange={(e) => handleRatioChange(e.target.value)}
            inputProps={{
              step: "0.01",
              min: minRatio.times(100).div(BASIS_POINTS),
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <label htmlFor="asset_lent" >Amount of {metadata.symbolAsset} you'll mint:</label>
          <input
            type="number"
            name="asset_lent"
            value={toLend.toFixed(decimalsAsset)}
            onChange={(e) => handleToLendChange(e.target.value)} />
          <TextField
            fullWidth
            label={`Amount of ${metadata.symbolAsset} you'll mint:`}
            type="number"
            name="asset_lent"
            value={toLend.toFixed(decimalsAsset)}
            onChange={(e) => handleToLendChange(e.target.value)}
            inputProps={{
              step: stepValueAsset,
              max: collateral
                .times(metadata.lastpriceXLM)
                .div(metadata.lastpriceAsset)
                .times(new BigNumber(minRatio).div(BASIS_POINTS))
                .toFixed(decimalsAsset),
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
          Current collateralization ratio: {displayRatio}%
          {ratio.isLessThan(minRatio) && (
            <Typography variant="body2" color="error">
              (Below minimum ratio of {new BigNumber(minRatio).times(100).div(BASIS_POINTS).toFixed(2)}%)
            </Typography>
          )}
        </Typography>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          disabled={ratio.isLessThan(minRatio) || !isSignedIn}
        >
          Open CDP with ratio
        </Button>
      </Form>
    </Box>
  );
}

export const element = <New />;