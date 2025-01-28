interface AssetDetails {
  feed_address: string;
  pool_address: string;
  retroshades_cdp: string;
  retroshades_stake: string;
}

export interface AssetConfig {
  [key: string]: AssetDetails;
}

export const XLM_FEED_ADDRESS = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
export const assetConfig: AssetConfig = {
  'USDT': {
    feed_address: "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
    pool_address: "CCECE32QRX3PYIFAKH65ITCUT2JTYZTS4GEIFDWMQFSKJ5W6PVZWH2EE",
    retroshades_cdp: 'cdpb40df2a82e55c35f5fe3abb8faa758fc',
    retroshades_stake: 'stake_positionb40df2a82e55c35f5fe3abb8faa758fc',
  }
}