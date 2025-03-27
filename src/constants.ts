export const BASIS_POINTS = 10000;
export const PUBLIC_API_URL = import.meta.env.PUBLIC_RPC_URL || 'http://localhost:3000';
export const PUBLIC_RPC_URL =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const PUBLIC_NETWORK_PASSPHRASE =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";