import { Button } from "@mui/material";
import { useWallet } from "../../../wallet";
import AddressDisplay from "../cdp/AddressDisplay";
import ErrorToolTip from "../errorMessage/ErrorTooltip";
import { setAllowed } from "@stellar/freighter-api";

export default function Connect() {
  const { isSignedIn, networkPassphrase, account } = useWallet();

  if (isSignedIn && account) {
    return <AddressDisplay address={account} />;
  }
  if (networkPassphrase !== import.meta.env.PUBLIC_NETWORK_PASSPHRASE) {
    return (
      <ErrorToolTip
        errorMessage={`Wrong Freighter network selected.\n Select network with passphrase:\n "${import.meta.env.PUBLIC_NETWORK_PASSPHRASE}".`}
      />
    );
  }
  return (
    <div style={{ textAlign: "center" }}>
      <Button
        type="button"
        variant="contained"
        color="primary"
        onClick={() => setAllowed()}
      >
        Connect Wallet
      </Button>
    </div>
  );
}
