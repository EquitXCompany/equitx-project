import { useState } from "react";
import { Form, useLoaderData, redirect } from "react-router-dom";
import type { ActionFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import { freighter, useWallet } from "../../../wallet";

const BASIS_POINTS = 10000;

export const loader = async () => {
  return {
    minRatio: await xasset
      .minimum_collateralization_ratio()
      .then((t) => t.result),
    lastpriceXLM:
      Number(await xasset.lastprice_xlm().then((t) => t.result.price)) /
      10 ** 14, // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    lastpriceAsset:
      Number(await xasset.lastprice_asset().then((t) => t.result.price)) /
      10 ** 14, // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    symbolAsset: "xUSD", // FIXME: get from xasset, pending FT implementation
  };
};

export const action: ActionFunction = async ({ request }) => {
  const formData = Object.fromEntries(await request.formData());
  const decimalsXLM = 7; // FIXME: get from xlmSac.decimals (currently erroring in stellar-sdk)
  const decimalsAsset = 7; // FIXME: get from xasset.decimals (currently erroring in stellar-sdk)
  const cdp = {
    lender: formData.lender as string,
    collateral: BigInt(Number(formData.collateral) * 10 ** decimalsXLM),
    asset_lent: BigInt(Number(formData.asset_lent) * 10 ** decimalsAsset),
  };
  const tx = await xasset.open_cdp(cdp, { publicKey: cdp.lender });
  await tx.signAndSend({ signTransaction: freighter.signTransaction });
  return redirect(`/`);
};

function New() {
  const { account } = useWallet();
  const { lastpriceXLM, lastpriceAsset, minRatio, symbolAsset } =
    useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const [collateral, setCollateral] = useState(100);
  const [desiredRatio, setDesiredRatio] = useState(minRatio + 3000);
  const [toLend, setToLend] = useState(
    calcToLend({ collateral, lastpriceXLM, desiredRatio, lastpriceAsset }),
  );
  const updateAmountToLend = ({
    xlmDeposit,
    ratio,
  }: {
    ratio?: number;
    xlmDeposit?: number;
  }) => {
    setToLend(
      calcToLend({
        collateral: xlmDeposit ?? collateral,
        desiredRatio: ratio ?? desiredRatio,
        lastpriceXLM,
        lastpriceAsset,
      }),
    );
  };
  return (
    <>
      <h2>Open a new Collateralized Debt Position (CDP)</h2>
      <p>Current XLM price: ${lastpriceXLM}</p>
      <p>
        Current {symbolAsset} price: ${lastpriceAsset}
      </p>
      <Form method="post">
        <input type="hidden" name="lender" value={account} />
        <label>
          How much XLM to deposit?
          <input
            type="number"
            name="collateral"
            autoFocus
            value={collateral}
            onChange={(e) => {
              const collateral = Number(e.target.value);
              setCollateral(collateral);
              updateAmountToLend({ xlmDeposit: Number(e.target.value) });
            }}
          />
        </label>
        <label>
          Pick a collateralization ratio:
          <input
            type="number"
            min={minRatio / 100}
            value={desiredRatio / 100}
            onChange={(e) => {
              const ratio = Number(e.target.value) * 100;
              setDesiredRatio(ratio);
              updateAmountToLend({ ratio });
            }}
          />
          <p>
            The minimum collateralization ratio is {minRatio / 100}%. Your CDP
            will be liquidated if its ratio falls below this value. The higher
            you go above this ratio, the less likely you are to be liquidated.
            fully collateralized)
          </p>
        </label>
        <label>
          Amount of {symbolAsset} you'll mint:
          <input type="number" name="asset_lent" readOnly value={toLend} />
        </label>
        <button type="submit" style={{ marginTop: "2rem" }}>
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
