import { useLoaderData, useParams } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP } from "xasset";

interface Data {
  cdp: CDP | undefined;
  decimals: number;
  lastpriceXLM: number;
  lastpriceAsset: number;
  symbolAsset: string;
}

export const loader: LoaderFunction = async ({ params }): Promise<Data> => {
  const { lender } = params as { lender: string };
  return {
    cdp: await xasset.cdp({ lender }).then((tx) => tx.result),
    decimals: 7, // FIXME: get from xasset (to be implemented as part of ft)
    lastpriceXLM:
      Number(await xasset.lastprice_xlm().then((t) => t.result.price)) /
      10 ** 14, // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    lastpriceAsset:
      Number(await xasset.lastprice_asset().then((t) => t.result.price)) /
      10 ** 14, // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    symbolAsset: "xUSD", // FIXME: get from xasset (to be implemented as part of ft)
  };
};

function Show() {
  const { lender } = useParams() as { lender: string };
  const { cdp, decimals, lastpriceXLM, lastpriceAsset, symbolAsset } =
    useLoaderData() as Awaited<Data>;
  return (
    <>
      <h2>CDP for {lender}</h2>
      {cdp && (
        <>
          <p>Status: {cdp.status.tag}</p>
          <p>Ratio: {cdp.collateralization_ratio / 100}%</p>
          <p>
            XLM Locked: {Number(cdp.xlm_deposited / 10n ** BigInt(decimals))}
          </p>
          <p>USD Lent: {Number(cdp.asset_lent / 10n ** BigInt(decimals))}</p>
          <p>XLM Price: {lastpriceXLM}</p>
          <p>
            {symbolAsset} Price: {lastpriceAsset}
          </p>
        </>
      )}
    </>
  );
}

export const element = <Show />;
