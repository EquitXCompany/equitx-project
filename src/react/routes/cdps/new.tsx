import { useEffect, useState } from "react";
import { Form, redirect, useParams } from "react-router-dom";
import type { ActionFunction } from "react-router-dom";
import { useWallet } from "../../../wallet";
import { authenticatedContractCall } from "../../../utils/contractHelpers";
import BigNumber from "bignumber.js";
import { BASIS_POINTS } from "../../../constants";
import { Box, Button, InputLabel, TextField, Typography } from "@mui/material";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import ErrorMessage from "../../components/errorMessage";
import { getContractBySymbol } from "../../../contracts/util";
import { useContractMapping } from "../../../contexts/ContractMappingContext";

const decimalsXLM = 7;
const decimalsAsset = 7;
const stepValueXLM = `0.${"0".repeat(decimalsXLM - 1)}1`;
const stepValueAsset = `0.${"0".repeat(decimalsAsset - 1)}1`;

export const action: ActionFunction = async ({ request, params }) => {
  const formData = Object.fromEntries(await request.formData());
  const assetSymbol = params.assetSymbol;
  const contractMapping = JSON.parse(formData.contractMapping as string); // Parse contractMapping from hidden input

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    throw new Error("Invalid asset symbol");
  }

  const contractClient = getContractBySymbol(assetSymbol, contractMapping);
  const cdp = {
    lender: formData.lender as string,
    collateral: new BigNumber(formData.collateral?.toString() || "0")
      .times(new BigNumber(10).pow(decimalsXLM))
      .toFixed(0),
    asset_lent: new BigNumber(formData.asset_lent?.toString() || "0")
      .times(new BigNumber(10).pow(decimalsAsset))
      .toFixed(0),
  };

  await authenticatedContractCall(contractClient.open_cdp, cdp);

  return redirect(`/cdps/${assetSymbol}`);
};

export function NewCdp(props: React.ComponentProps<typeof Box>) {
  const { assetSymbol } = useParams();
  const { account, isSignedIn } = useWallet();
  const [minRatio, setMinRatio] = useState(new BigNumber(0));
  const contractMapping = useContractMapping();

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  const { data: metadata, isLoading } = useStabilityPoolMetadata(
    assetSymbol,
    contractMapping,
  );
  const [collateral, setCollateral] = useState(new BigNumber(100));
  const [toLend, setToLend] = useState(new BigNumber(0));
  const [ratio, setRatio] = useState(new BigNumber(110));

  useEffect(() => {
    const contractClient = getContractBySymbol(assetSymbol, contractMapping);
    const fetchMinRatio = async () => {
      const newMinRatio = await contractClient
        .minimum_collateralization_ratio()
        .then((t: { result: number }) => new BigNumber(t.result));
      setMinRatio(newMinRatio);
    };
    fetchMinRatio();
  }, [assetSymbol, contractMapping]);

  const updateRatio = (newCollateral: BigNumber, newToLend: BigNumber) => {
    if (newToLend.isZero() || !metadata) {
      setRatio(new BigNumber(0));
    } else {
      const newRatio = newCollateral
        .times(metadata.lastpriceXLM)
        .times(BASIS_POINTS)
        .div(newToLend.times(metadata.lastpriceAsset))
        .decimalPlaces(0);
      setRatio(newRatio);
    }
  };

  const handleCollateralChange: React.ChangeEventHandler<HTMLInputElement> = (
    e,
  ) => {
    const newCollateral = new BigNumber(e.target.value);
    setCollateral(newCollateral);
    updateRatio(newCollateral, toLend);
  };

  const handleToLendChange: React.ChangeEventHandler<HTMLInputElement> = (
    e,
  ) => {
    const newToLend = new BigNumber(e.target.value);
    setToLend(newToLend);
    updateRatio(collateral, newToLend);
  };

  const handleRatioChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!metadata) return;
    const valTo2Decimals = parseFloat(e.target.value).toFixed(2);
    const newRatio = new BigNumber(valTo2Decimals).times(BASIS_POINTS).div(100);
    setRatio(newRatio);
    const newToLend = collateral
      .times(metadata.lastpriceXLM)
      .times(BASIS_POINTS)
      .div(newRatio)
      .div(metadata.lastpriceAsset);
    setToLend(
      newToLend.decimalPlaces(decimalsAsset, BigNumber.ROUND_HALF_EVEN),
    );
  };

  const displayRatio = ratio.isGreaterThan(0)
    ? ratio.times(100).div(BASIS_POINTS).toFixed(2)
    : 0;
  const ratioBelowMinimum = ratio.isLessThan(minRatio);

  useEffect(() => {
    updateRatio(collateral, toLend);
  }, [metadata]);

  if (isLoading || !metadata) {
    return <div>Loading...</div>;
  }

  return (
    <Box {...props} sx={{ textAlign: "left", ...props.sx }}>
      <Form method="post" action={`/cdps/${assetSymbol}/new`}>
        <input type="hidden" name="lender" value={account} />
        <input
          type="hidden"
          name="contractMapping"
          value={JSON.stringify(contractMapping)}
        />
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="xlmDeposit">How much XLM to deposit?</InputLabel>
          <TextField
            fullWidth
            id="xlmDeposit"
            type="number"
            name="collateral"
            autoFocus
            value={collateral.toNumber()}
            onChange={handleCollateralChange}
            inputProps={{ step: stepValueXLM }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Box sx={{ mt: 2 }} className="">
          <InputLabel htmlFor="collateralizationRatio">
            Set collateralization ratio (%)
          </InputLabel>
          <TextField
            id="collateralizationRatio"
            fullWidth
            type="number"
            error={ratioBelowMinimum}
            helperText={
              ratioBelowMinimum ? "Ratio below minimum collateralization" : ""
            }
            value={ratio.times(100).div(BASIS_POINTS)}
            onChange={handleRatioChange}
            inputProps={{
              step: "0.01",
              min: minRatio.times(100).div(BASIS_POINTS),
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="mintAmount">
            Amount of {metadata.symbolAsset} you&apos;ll mint
          </InputLabel>
          <TextField
            fullWidth
            id="mintAmount"
            type="number"
            name="asset_lent"
            value={toLend.toFixed(decimalsAsset)}
            onChange={handleToLendChange}
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
            <Typography component="span" variant="body2" color="error">
              (Below minimum ratio of{" "}
              {new BigNumber(minRatio).times(100).div(BASIS_POINTS).toFixed(2)}
              %)
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
