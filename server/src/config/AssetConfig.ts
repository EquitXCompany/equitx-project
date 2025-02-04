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
    pool_address: "CD7F3DA5Q3PZ2MYN52XFVN2VWTN4I3VXLDR5BRKD67KVUURKJR6K6DOJ",
    retroshades_cdp: 'cdp4d0b29a216e7c4c64f057e80ee39d69a',
    retroshades_stake: 'stake_position4d0b29a216e7c4c64f057e80ee39d69a',
  }
}