import { useState } from 'react';
import type { CDP } from "xasset";
import { useCdps } from '../../hooks/useCdps';
import Card from "../../components/card";
import { useWallet } from "../../../wallet";
import { getStatusColor } from "../../../utils/contractHelpers";

function List() {
  const [lastQueriedTimestamp] = useState(() => Math.floor(Date.now() / 1000) - 86400); // Last 24 hours
  const { data: cdps, isLoading, error } = useCdps(lastQueriedTimestamp);
  const { account } = useWallet();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred: {(error as Error).message}</div>;
  if (!cdps) return <div>No CDPs found</div>;

  const indexOfYours = cdps.findIndex((cdp) => cdp.lender === account);
  const yours = cdps[indexOfYours];
  
  let sortedCdps = [...cdps];
  if (yours) {
    sortedCdps = [yours, ...cdps.filter(cdp => cdp.lender !== account)];
  }

  return (
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
        {sortedCdps.map((cdp) => (
          <Card
            key={cdp.lender}
            href={`/${cdp.lender}`}
            title={cdp.lender === account ? "yours" : cdp.lender}
          >
            <div
              style={{
                color: getStatusColor(cdp.status),
              }} >
              {cdp.status} ({cdp.collateralizationRatio / 100}%
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
  );
}

export default List;