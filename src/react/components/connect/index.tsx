import { useState, useEffect } from "react";
import { getState, onChange, freighter } from "../../../wallet";

export default function Connect() {
  const [isSignedIn, setIsSignedIn] = useState(getState().isSignedIn);
  const [networkPassphrase, setNetwork] = useState(
    getState().networkPassphrase,
  );
  const [account, setAccount] = useState(getState().account);

  useEffect(() => {
    onChange(async (state) => {
      setIsSignedIn(state.isSignedIn);
      setNetwork(state.networkPassphrase);
      setAccount(state.account);
    });
  }, []);

  if (isSignedIn && account) {
    return <p style={{ textAlign: "center" }}>Connected as {account}</p>;
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
