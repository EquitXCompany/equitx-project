import { useLoaderData } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import xasset from "../../../contracts/xasset";
import type { CDP } from "xasset";
import Card from "../../components/card";
import { useWallet } from "../../../wallet";
import { getStatusColor } from "../../../utils/contractHelpers";

export const loader: LoaderFunction = async (): Promise<CDP[]> => {
  const tx = await xasset.cdps();
  return tx.result;
};


function List() {
  const cdps = useLoaderData() as Awaited<CDP[]>;
  const { account } = useWallet();
  const indexOfYours = cdps.findIndex((cdp) => cdp.lender === account);
  const yours = cdps[indexOfYours];
  if (yours) {
    cdps.splice(indexOfYours, 1);
    cdps.unshift(yours);
  }
  return (
    cdps.length > 0 && (
      <div className="grid">
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
              <div
                style={{
                  color: getStatusColor(cdp.status.tag),
                }} >
                {cdp.status.tag} ({cdp.collateralization_ratio / 100}%
                collateralized)
              </div>
            </Card>
          ))}
          {!yours && (
            <Card title="New" href="/new">
              Create a CDP
            </Card>
          )}
        </ul>
      </div>
    )
  );
}

export const element = <List />;
