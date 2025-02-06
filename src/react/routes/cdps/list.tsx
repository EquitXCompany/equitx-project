import { useCdps, CalculateCollateralizationRatio, useCdpsByAssetSymbol } from '../../hooks/useCdps';
import Card from "../../components/card";
import { useWallet } from "../../../wallet";
import { getStatusColor } from "../../../utils/contractHelpers";
import { useStabilityPoolMetadata } from '../../hooks/useStabilityPoolMetadata';
import { useParams } from 'react-router-dom';
import ErrorMessage from '../../components/errorMessage';
import { contractMapping, XAssetSymbol } from '../../../contracts/contractConfig';

function List() {
  const { assetSymbol } = useParams();
  if (!assetSymbol) {
    return (
      <ErrorMessage
        title="Error: No Asset Selected"
        message="Please select an asset from the home page to view its stability pool."
      />
    );
  }
  
  if (!contractMapping[assetSymbol as XAssetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  const { data: cdps, isLoading: cdpsLoading, error: cdpsError } = useCdpsByAssetSymbol(assetSymbol);
  const { data: stabilityData, isLoading: stabilityLoading, error: stabilityError } = useStabilityPoolMetadata(assetSymbol as XAssetSymbol);
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
            href={`/cdps/${assetSymbol}/${cdp.lender}`}
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
          <Card title="New" href={`/cdps/${assetSymbol}/new`}>
            Create a CDP
          </Card>
        )}
      </ul>
    </div>
  );
}

export const element = <List />;