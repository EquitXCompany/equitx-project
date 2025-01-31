import { useParams, Link } from "react-router-dom";
import { CDPDisplay } from "../../components/cdp/CDPDisplay";
import AddressDisplay from "../../components/cdp/AddressDisplay";
import { useStabilityPoolMetadata } from "../../hooks/useStabilityPoolMetadata";
import { useContractCdp } from "../../hooks/useCdps";

function Show() {
  const { lender } = useParams() as { lender: string };
  const { data: metadata, isLoading: isLoadingMetadata } = useStabilityPoolMetadata();
  const { data: cdp, isLoading: isLoadingCdp } = useContractCdp(lender);
  const decimals = 7; // FIXME: get from xasset (to be implemented as part of ft)

  if (isLoadingMetadata || isLoadingCdp || !metadata) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Link to="/" className="back-link">← Back to List</Link>
      <h2>CDP for <AddressDisplay address={lender} /></h2>
      {cdp && (
        <>
          <CDPDisplay
            cdp={cdp}
            decimals={decimals}
            lastpriceXLM={metadata.lastpriceXLM}
            lastpriceAsset={metadata.lastpriceAsset}
            symbolAsset={metadata.symbolAsset}
            lender={lender}
          />
          <Link to={`/${lender}/edit`} className="edit-link">Edit CDP</Link>
        </>
      )}
    </>
  );
}

export const element = <Show />;
