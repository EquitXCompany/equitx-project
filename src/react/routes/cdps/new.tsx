import { useEffect, useState } from "react";
import { Form, useLoaderData, redirect } from "react-router-dom";
import type { ActionFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import { freighter, useWallet } from "../../../wallet";
import BigNumber from 'bignumber.js';
import { BASIS_POINTS } from "../../../constants";

export const loader = async () => {
  return {
    minRatio: await xasset
      .minimum_collateralization_ratio()
      .then((t) => new BigNumber(t.result)),
    lastpriceXLM: new BigNumber((await xasset.lastprice_xlm().then((t) => t.result.price)).toString())
      .div(new BigNumber(10).pow(14)), // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    lastpriceAsset: new BigNumber((await xasset.lastprice_asset().then((t) => t.result.price)).toString())
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
  // @ts-expect-error publicKey is not in the type, but is passed through; see https://github.com/stellar/js-stellar-sdk/issues/1055
  const tx = await xasset.open_cdp(cdp, { publicKey: cdp.lender });
  await tx.signAndSend({ signTransaction: freighter.signTransaction });
  return redirect(`/`);
};

function New() {
  const { account } = useWallet();
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
    setToLend(newToLend.decimalPlaces(decimalsAsset, BigNumber.ROUND_DOWN));
  };

  useEffect(() => {
    // Initialize ratio when collateral is set
    updateRatio(collateral, toLend);
  }, []);

  return (
    <>
      <h2>Open a new Collateralized Debt Position (CDP)</h2>
      <p>Current XLM price: ${lastpriceXLM.toFixed(decimalsXLM)}</p>
      <p>Current {symbolAsset} price: ${lastpriceAsset.toFixed(decimalsAsset)}</p>
      <Form method="post">
        <input type="hidden" name="lender" value={account} />
        <label>
          How much XLM to deposit?
          <input
            type="number"
            name="collateral"
            autoFocus
            value={collateral.toNumber()}
            onChange={(e) => handleCollateralChange(e.target.value)}
            step={stepValueXLM}
          />
        </label>
        <label>
          Set collateralization ratio (%):
          <input
            type="number"
            value={ratio.times(100).div(BASIS_POINTS).toFixed(2)}
            onChange={(e) => handleRatioChange(e.target.value)}
            step="0.01"
            min={minRatio.times(100).div(BASIS_POINTS).toFixed(2)}
          />
        </label>
        <label>
          Amount of {symbolAsset} you'll mint:
          <input
            type="number"
            name="asset_lent"
            value={toLend.toFixed(decimalsAsset)}
            onChange={(e) => handleToLendChange(e.target.value)}
            step={stepValueAsset}
            max={collateral.times(lastpriceXLM).div(lastpriceAsset).times(new BigNumber(minRatio).div(BASIS_POINTS)).toFixed(decimalsAsset)}
          />
        </label>
        <p>
          Current collateralization ratio: {ratio.times(100).div(BASIS_POINTS).toFixed(2)}%
          {ratio.isLessThan(minRatio) && (
            <span style={{ color: 'red' }}> (Below minimum ratio of {new BigNumber(minRatio).times(100).div(BASIS_POINTS).toFixed(2)}%)</span>
          )}
        </p>
        <button type="submit" style={{ marginTop: "2rem" }} disabled={ratio.isLessThan(minRatio)}>
          Open CDP
        </button>
      </Form>
    </>
  );

}

export const element = <New />;

/*
 * Calculate new amount of xAsset to lend.
 * ratio = XLM collateral * XLM's USD price / xAsset to lend / xAsset's USD price
 * xAsset to lend = XLM collateral * XLM's USD price / ratio / xAsset's USD price
 */
function calcToLend({
  collateral,
  desiredRatio,
  lastpriceXLM,
  lastpriceAsset,
}: {
  collateral: number;
  desiredRatio: number;
  lastpriceXLM: number;
  lastpriceAsset: number;
}) {
  return (
    (collateral * lastpriceXLM * BASIS_POINTS) / desiredRatio / lastpriceAsset
  );
}
