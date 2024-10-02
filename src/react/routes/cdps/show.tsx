import { useLoaderData, useParams, Link } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP, PriceData } from "xasset";
import BigNumber from "bignumber.js";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import AddressDisplay from "../../components/cdp/AddressDisplay";
import { unwrapResult } from "../../../utils/contractHelpers";

interface Data {
  cdp: CDP | undefined;
  decimals: number;
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  symbolAsset: string;
}

export const loader: LoaderFunction = async ({ params }): Promise<Data> => {
  const { lender } = params as { lender: string };
  return {
    cdp: await xasset.cdp({ lender }).then((tx) => unwrapResult(tx.result, "failed to retrieve CDP")),
    decimals: 7, // FIXME: get from xasset (to be implemented as part of ft)
    lastpriceXLM: new BigNumber((await xasset.lastprice_xlm().then((t) => (unwrapResult(t.result, "Failed to retrieve the XLM price") as PriceData).price)).toString())
      .div(new BigNumber(10).pow(14)), // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    lastpriceAsset: new BigNumber((await xasset.lastprice_asset().then((t) => (unwrapResult(t.result, "Failed to retrieve the asset price") as PriceData).price)).toString())
      .div(new BigNumber(10).pow(14)), // FIXME: get `14` from xasset (currently erroring in stellar-sdk)
    symbolAsset: "xUSD", // FIXME: get from xasset (to be implemented as part of ft)
  };
};

function Show() {
  const { lender } = useParams() as { lender: string };
  const { cdp, decimals, lastpriceXLM, lastpriceAsset, symbolAsset } =
    useLoaderData() as Awaited<Data>;

  return (
    <>
      <Link to="/" className="back-link">← Back to List</Link>
      <h2>CDP for <AddressDisplay address={lender} /></h2>
      {cdp && (
        <>
          <CDPDisplay
            cdp={cdp}
            decimals={decimals}
            lastpriceXLM={lastpriceXLM}
            lastpriceAsset={lastpriceAsset}
            symbolAsset={symbolAsset}
            lender={lender}
          />
          <Link to={`/${lender}/edit`} className="edit-link">Edit CDP</Link>
        </>
      )}
    </>
  );
}

export const element = <Show />;
