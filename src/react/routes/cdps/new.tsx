import { useEffect, useState } from "react";
import { Form, useLoaderData, redirect } from "react-router-dom";
import type { ActionFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import { useWallet } from "../../../wallet";
import { authenticatedContractCall } from "../../../utils/contractHelpers";
import BigNumber from 'bignumber.js';
import { BASIS_POINTS } from "../../../constants";
import { Box, Button, TextField, Typography } from '@mui/material';
import { unwrapResult } from "../../../utils/contractHelpers";
import { type PriceData } from "xasset";

export const loader = async () => {
  return {
    minRatio: await xasset
      .minimum_collateralization_ratio()
      .then((t) => new BigNumber(t.result)),
    lastpriceXLM: new BigNumber((await xasset.lastprice_xlm().then((t) => (unwrapResult(t.result, "Failed to retrieve the XLM price") as PriceData).price)).toString())
      .div(new BigNumber(10).pow(14)), // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    lastpriceAsset: new BigNumber((await xasset.lastprice_asset().then((t) => (unwrapResult(t.result, "Failed to retrieve the asset price") as PriceData).price)).toString())
      .div(new BigNumber(10).pow(14)), // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    symbolAsset: "xUSD", // FIXME: get from xasset, pending FT implementation
  };
};

export const action: ActionFunction = async ({ request }) => {
  const formData = Object.fromEntries(await request.formData());
  const decimalsXLM = 7; // FIXME: get from xlmSac.decimals (currently erroring in stellar-sdk)
  const decimalsAsset = 7; // FIXME: get from xasset.decimals (currently erroring in stellar-sdk)
  const cdp = {
    lender: formData.lender as string,
    collateral: new BigNumber(formData.collateral?.toString() || '0').times(new BigNumber(10).pow(decimalsXLM)).toFixed(0),
    asset_lent: new BigNumber(formData.asset_lent?.toString() || '0').times(new BigNumber(10).pow(decimalsAsset)).toFixed(0),
  };
  await authenticatedContractCall(xasset.open_cdp, cdp);
  return redirect(`/`);
};

function New() {
  const { account, isSignedIn } = useWallet();
  const { lastpriceXLM, lastpriceAsset, minRatio, symbolAsset } =
    useLoaderData() as Awaited<ReturnType<typeof loader>>;

  const [collateral, setCollateral] = useState(new BigNumber(100));
  const [toLend, setToLend] = useState(new BigNumber(0));
  const [ratio, setRatio] = useState(new BigNumber(0));
  const decimalsXLM = 7; // FIXME: get from xlmSac.decimals (currently erroring in stellar-sdk)
  const decimalsAsset = 7; // FIXME: get from xasset.decimals (currently erroring in stellar-sdk)
  const stepValueXLM = `0.${'0'.repeat(decimalsXLM - 1)}1`;
  const stepValueAsset = `0.${'0'.repeat(decimalsAsset - 1)}1`;

  const updateRatio = (newCollateral: BigNumber, newToLend: BigNumber) => {
    if (newToLend.isZero()) {
      setRatio(new BigNumber(0));
    } else {
      const newRatio = newCollateral.times(lastpriceXLM).times(BASIS_POINTS).div(newToLend.times(lastpriceAsset));
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
    const newRatio = new BigNumber(value).times(BASIS_POINTS).div(100);
    setRatio(newRatio);
    const newToLend = collateral.times(lastpriceXLM).times(BASIS_POINTS).div(newRatio).div(lastpriceAsset);
    setToLend(newToLend.decimalPlaces(decimalsAsset, BigNumber.ROUND_HALF_EVEN));
  };

  useEffect(() => {
    // Initialize ratio when collateral is set
    updateRatio(collateral, toLend);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Open a new Collateralized Debt Position (CDP)
      </Typography>
      <Form method="post">
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
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Set collateralization ratio (%)"
            type="number"
            value={ratio.times(100).div(BASIS_POINTS).toFixed(2)}
            onChange={(e) => handleRatioChange(e.target.value)}
            inputProps={{
              step: "0.01",
              min: minRatio.times(100).div(BASIS_POINTS).toFixed(2),
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={`Amount of ${symbolAsset} you'll mint:`}
            type="number"
            name="asset_lent"
            value={toLend.toFixed(decimalsAsset)}
            onChange={(e) => handleToLendChange(e.target.value)}
            inputProps={{
              step: stepValueAsset,
              max: collateral
                .times(lastpriceXLM)
                .div(lastpriceAsset)
                .times(new BigNumber(minRatio).div(BASIS_POINTS))
                .toFixed(decimalsAsset),
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
          Current collateralization ratio: {ratio.times(100).div(BASIS_POINTS).toFixed(2)}%
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
          Open CDP
        </Button>
      </Form>
    </Box>
  );
}

export const element = <New />;
