import { useLoaderData, useParams } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP } from "xasset";

interface Data {
  cdp: CDP | undefined;
  decimals: number;
  lastprice: bigint | undefined;
  decimalsOracle: number;
}

export const loader: LoaderFunction = async ({ params }): Promise<Data> => {
  const { lender } = params as { lender: string };
  return {
    cdp: await xasset.cdp({ lender }).then((tx) => tx.result),
    decimals: 7, // FIXME: get from xasset (to be implemented as part of ft)
    lastprice: await xasset.lastprice().then((tx) => tx.result!.price),
    decimalsOracle: 14, // FIXME: get from xasset (currently erroring in stellar-sdk)
  };
};

function Show() {
  const { lender } = useParams() as { lender: string };
  const { cdp, decimals, lastprice, decimalsOracle } =
    useLoaderData() as Awaited<Data>;
  return (
    <>
      <h2>CDP for {lender}</h2>
      {cdp && lastprice && (
        <>
          <p>Status: {cdp.status.tag}</p>
          <p>Ratio: {cdp.collateralization_ratio / 100}%</p>
          <p>
            XLM Locked: {Number(cdp.xlm_deposited / 10n ** BigInt(decimals))}
          </p>
          <p>USD Lent: {Number(cdp.asset_lent / 10n ** BigInt(decimals))}</p>
          <p>XLM Price: {Number(lastprice / 10n ** BigInt(decimalsOracle))}</p>
        </>
      )}
    </>
  );
}

export const element = <Show />;
