import { useParams, Link } from "react-router-dom";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { useContractCdp } from "../../hooks/useCdps";
import ErrorMessage from "../../components/errorMessage";
import { useContractMapping } from "../../../contexts/ContractMappingContext";

function Show() {
  const { assetSymbol, lender } = useParams();
  const contractMapping = useContractMapping();

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  if (!lender) {
    return (
      <ErrorMessage
        title="Error: No Lender Address Provided"
        message="Please provide a valid lender address to view the CDP."
      />
    );
  }

  const { data: metadata, isLoading: isLoadingMetadata } = useStabilityPoolMetadata(assetSymbol, contractMapping);
  const { data: cdp, isLoading: isLoadingCdp } = useContractCdp(assetSymbol, contractMapping, lender);
  const decimals = 7; // FIXME: get from xasset (to be implemented as part of ft)

  if (isLoadingMetadata || isLoadingCdp || !metadata) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Link to={`/cdps/${assetSymbol}`} className="back-link">← Back to List</Link>
      {cdp && (
        <>
          <CDPDisplay
            cdp={cdp}
            decimals={decimals}
            interestRate={metadata.interestRate}
            lastpriceXLM={metadata.lastpriceXLM}
            lastpriceAsset={metadata.lastpriceAsset}
            symbolAsset={metadata.symbolAsset}
            lender={lender}
          />
          <Link to={`/cdps/${assetSymbol}/${lender}/edit`} className="edit-link">Edit CDP</Link>
        </>
      )}
    </>
  );
}

export const element = <Show />;
