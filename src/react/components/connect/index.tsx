import { useWallet, freighter } from "../../../wallet";

export default function Connect() {
  const { isSignedIn, networkPassphrase, account } = useWallet();

  if (isSignedIn && account) {
    return (
      <p style={{ textAlign: "center" }}>
        Connected as{" "}
        <span title={account} className="truncate">
          {account}
        </span>
      </p>
    );
  }
  if (networkPassphrase !== import.meta.env.PUBLIC_NETWORK_PASSPHRASE) {
    return (
      <p style={{ textAlign: "center", color: "#b33" }}>
        Wrong Freighter network selected. Select network with passphrase "
        {import.meta.env.PUBLIC_NETWORK_PASSPHRASE}".
      </p>
    );
  }
  return (
    <div style={{ textAlign: "center" }}>
      <button type="button" onClick={() => freighter.setAllowed()}>
        Connect Freighter Wallet
      </button>
    </div>
  );
}
