import { useState, useEffect } from "react";
import { useLoaderData } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP } from "xasset";
import Card from "../../components/card";
import { getState, onChange } from "../../../wallet";

export const loader: LoaderFunction = async (): Promise<CDP[]> => {
  const tx = await xasset.cdps();
  return tx.result;
};

function List() {
  const cdps = useLoaderData() as Awaited<CDP[]>;
  const [account, setAccount] = useState(getState().account);
  useEffect(() => {
    onChange(async (state) => {
      setAccount(state.account);
    });
  }, []);
  return (
    cdps.length > 0 && (
      <ul
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(24ch, 1fr))",
          gap: "2rem",
          padding: "0",
        }}
      >
        {cdps.map((cdp) => (
          <Card
            key={cdp.lender}
            href={`/${cdp.lender}`}
            title={cdp.lender === account ? "yours" : cdp.lender}
          >
            {cdp.status.tag} ({cdp.collateralization_ratio / 100}%
            collateralized)
          </Card>
        ))}
      </ul>
    )
  );
}

export const element = <List />;
