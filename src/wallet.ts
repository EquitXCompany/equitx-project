import { useEffect, useState } from "react";
import { getAddress, isConnected, getNetwork } from "@stellar/freighter-api";

let account: string;
let connected: boolean;
let network: string;
let networkPassphrase: string;

export function isSignedIn() {
  return (
    connected &&
    !!account &&
    networkPassphrase === import.meta.env.PUBLIC_NETWORK_PASSPHRASE
  );
}

export function getState() {
  return {
    account,
    connected,
    network,
    networkPassphrase,
    isSignedIn: isSignedIn(),
  };
}

type onChangeHandler = (args: {
  account: string;
  connected: boolean;
  network: string;
  networkPassphrase: string;
  isSignedIn: boolean;
}) => void | Promise<void>;

const onChangeHandlers: onChangeHandler[] = [];

export function onChange(handler: onChangeHandler) {
  onChangeHandlers.push(handler);
}

export function useWallet() {
  const [state, setState] = useState(getState());
  useEffect(() => {
    onChange((newState) => setState(newState));
    return () => {
      onChangeHandlers.splice(onChangeHandlers.indexOf(setState), 1);
    };
  }, []);
  return state;
}

export async function refresh(forceUpdate = false) {
  const [newUserInfo, newIsConnected, newNetworkDetails] = await Promise.all([
    getAddress(),
    isConnected(),
    getNetwork(),
  ]);
  if (
    forceUpdate ||
    newUserInfo.address !== account ||
    newIsConnected.isConnected !== connected ||
    newNetworkDetails.network !== network ||
    newNetworkDetails.networkPassphrase !== networkPassphrase
  ) {
    account = newUserInfo.address;
    connected = newIsConnected.isConnected;
    network = newNetworkDetails.network;
    networkPassphrase = newNetworkDetails.networkPassphrase;
    const signedIn = isSignedIn();
    await Promise.all(
      onChangeHandlers.map((fn) =>
        fn({
          account,
          connected,
          network,
          networkPassphrase,
          isSignedIn: signedIn,
        }),
      ),
    );
  }
}

setTimeout(refresh, 1);
setInterval(refresh, 1000);
