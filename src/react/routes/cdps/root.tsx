import { useLoaderData, Outlet } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import Connect from "../../components/connect";

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
          minimum collateralization ratio: {ratio / 100}%
        </p>
      )}
      <Outlet />
    </>
  );
}

export const element = <Root />;
