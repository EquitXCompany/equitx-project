import { useLoaderData, Outlet } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import Connect from "../../components/connect";
import BigNumber from "bignumber.js";
import { BASIS_POINTS } from "../../../constants";

export const loader: LoaderFunction = async (): Promise<number> => {
  const tx = await xasset.minimum_collateralization_ratio();
  return tx.result;
};

function Root() {
  const ratio = useLoaderData() as Awaited<number>;
  return (
    <>
      <h1
        style={{
          fontSize: "4rem",
          fontWeight: "700",
          lineHeight: "1",
          textAlign: "center",
          marginBottom: "1em",
        }}
      >
        XLM↔USD Pool
      </h1>
      <Connect />
      {ratio && (
        <p style={{ textAlign: "center" }}>
          minimum collateralization ratio: {new BigNumber(ratio).times(100).div(BASIS_POINTS).toFixed(2)}%
        </p>
      )}
      <Outlet />
    </>
  );
}

export const element = <Root />;
