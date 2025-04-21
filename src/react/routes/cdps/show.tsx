import { useParams, Link } from "react-router-dom";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { useContractCdp } from "../../hooks/useCdps";
import ErrorMessage from "../../components/errorMessage";
import { contractMapping, XAssetSymbol } from "../../../contracts/contractConfig";

function Show() {
  const { assetSymbol, lender } = useParams() as { assetSymbol: XAssetSymbol, lender: string };

  if (!assetSymbol || !contractMapping[assetSymbol]) {
    return (
      <ErrorMessage
        title="Error: Invalid Asset"
        message={`The asset "${assetSymbol}" does not exist. Please select a valid asset from the home page.`}
      />
    );
  }

  const { data: metadata, isLoading: isLoadingMetadata } = useStabilityPoolMetadata(assetSymbol);
  const { data: cdp, isLoading: isLoadingCdp } = useContractCdp(assetSymbol, lender);
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
