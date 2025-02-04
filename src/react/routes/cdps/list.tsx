import { useCdps, CalculateCollateralizationRatio } from '../../hooks/useCdps';
import Card from "../../components/card";
import { useWallet } from "../../../wallet";
import { getStatusColor } from "../../../utils/contractHelpers";
import { useStabilityPoolMetadata } from '../../hooks/useStabilityPoolMetadata';

function List() {
  const { data: cdps, isLoading: cdpsLoading, error: cdpsError } = useCdps();
  const { data: stabilityData, isLoading: stabilityLoading, error: stabilityError } = useStabilityPoolMetadata();
  const { account } = useWallet();

  if (cdpsLoading || stabilityLoading) return <div>Loading...</div>;
  if (cdpsError || stabilityError) return <div>An error occurred: {cdpsError?.message || stabilityError?.message}</div>;
  if (!cdps || !stabilityData) return <div>No CDPs found</div>;

  const { lastpriceXLM, lastpriceAsset } = stabilityData;

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
              {cdp.status} ({CalculateCollateralizationRatio(cdp, lastpriceXLM, lastpriceAsset).times(100).toFixed(1)}%
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

export const element = <List />;