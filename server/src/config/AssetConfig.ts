interface AssetDetails {
  feed_address: string;
  pool_address: string;
  retroshades_cdp: string;
}

export interface AssetConfig {
  [key: string]: AssetDetails;
}

export const XLM_FEED_ADDRESS = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
export const assetConfig: AssetConfig = {
  'USDT': {
    feed_address: "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
    pool_address: "CCECE32QRX3PYIFAKH65ITCUT2JTYZTS4GEIFDWMQFSKJ5W6PVZWH2EE",
    retroshades_cdp: 'cdp1a16c60a7890c14872ae7c3a025c31a9',
  }
}