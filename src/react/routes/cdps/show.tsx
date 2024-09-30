import { useLoaderData, useParams, Link } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP } from "xasset";
import BigNumber from "bignumber.js";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import AddressDisplay from "../../components/cdp/AddressDisplay";

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
    cdp: await xasset.cdp({ lender }).then((tx) => tx.result),
    decimals: 7, // FIXME: get from xasset (to be implemented as part of ft)
    lastpriceXLM: new BigNumber(await xasset.lastprice_xlm().then((t) => t.result.price)).div(10 ** 14),
    lastpriceAsset: new BigNumber(await xasset.lastprice_asset().then((t) => t.result.price)).div(10 ** 14),
    symbolAsset: "xUSD", // FIXME: get from xasset (to be implemented as part of ft)
  };
};

function Show() {
  const { lender } = useParams() as { lender: string };
  const { cdp, decimals, lastpriceXLM, lastpriceAsset, symbolAsset } =
    useLoaderData() as Awaited<Data>;

  const formatNumber = (value: BigNumber | number, decimalPlaces: number) => {
    return new BigNumber(value).toFixed(decimalPlaces);
  };

  return (
    <>
      <Link to="/" className="back-link">← Back to List</Link>
      <h2>CDP for <AddressDisplay lender={lender} /></h2>
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
