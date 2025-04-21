import {
  CalculateCollateralizationRatio,
  useMergedCdps,
} from "../../hooks/useCdps";
import Card from "../../components/card";
import { useWallet } from "../../../wallet";
import { getStatusColor } from "../../../utils/contractHelpers";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { useParams } from "react-router-dom";
import ErrorMessage from "../../components/errorMessage";
import { useTheme } from "../../../contexts/ThemeContext";
import { useContractMapping } from "../../../contexts/ContractMappingContext";

function List() {
  const { assetSymbol } = useParams();
  const { account } = useWallet();
  const { isDarkMode } = useTheme();
  const contractMapping = useContractMapping();

  if (!assetSymbol) {
    return (
      <ErrorMessage
        title="Error: No Asset Selected"
        message="Please select an asset from the home page to view its stability pool."
      />
    );
  }

  if (!contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  const {
    data: cdps,
    isLoading: cdpsLoading,
    error: cdpsError,
  } = useMergedCdps(assetSymbol, contractMapping, account);
  const {
    data: stabilityData,
    isLoading: stabilityLoading,
    error: stabilityError,
  } = useStabilityPoolMetadata(assetSymbol, contractMapping);

  if (cdpsLoading || stabilityLoading) return <div>Loading...</div>;
  if (cdpsError || stabilityError)
    return (
      <div>
        An error occurred: {cdpsError?.message || stabilityError?.message}
      </div>
    );
  if (!cdps || !stabilityData) return <div>No CDPs found</div>;

  const { lastpriceXLM, lastpriceAsset } = stabilityData;

  const yours = account
    ? cdps.find((cdp) => cdp.lender === account)
    : undefined;

  let sortedCdps = [...cdps];
  if (yours) {
    sortedCdps = [yours, ...cdps.filter((cdp) => cdp.lender !== account)];
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
            href={
              cdp.status.toLowerCase() === "closed"
                ? cdp.lender === account
                  ? `/cdps/${assetSymbol}/new`
                  : ""
                : `/cdps/${assetSymbol}/${cdp.lender}`
            }
            title={cdp.lender === account ? "yours" : cdp.lender}
          >
            <div
              style={{
                color: getStatusColor(cdp.status, isDarkMode),
              }}
            >
              {cdp.status}
              {cdp.status.toLowerCase() !== "closed" &&
                ` (${CalculateCollateralizationRatio(cdp, lastpriceXLM, lastpriceAsset).times(100).toFixed(1)}% collateralized)`}
              {cdp.status.toLowerCase() === "closed" &&
                cdp.lender === account && <div>Open a new one</div>}
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
