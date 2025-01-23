import { useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import xasset from '../../contracts/xasset';

interface StabilityPoolMetadata {
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  min_ratio: number;
  symbolAsset: string;
  contractId: string;
}

export function useStabilityPoolMetadata() {
  const [data, setData] = useState<StabilityPoolMetadata | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tx = await xasset.minimum_collateralization_ratio();
        const lastpriceXLM = new BigNumber(await xasset.lastprice_xlm().then((t) => {
          if (t.result.isOk()) {
            return t.result.unwrap().price.toString();
          } else {
            throw new Error("Failed to fetch XLM price");
          }
        })).div(10 ** 14);

        const lastpriceAsset = new BigNumber(await xasset.lastprice_asset().then((t) => {
          if (t.result.isOk()) {
            return t.result.unwrap().price.toString();
          } else {
            throw new Error("Failed to fetch asset price");
          }
        })).div(10 ** 14);

        setData({
          lastpriceXLM,
          lastpriceAsset,
          min_ratio: tx.result,
          symbolAsset: "xUSD",
          contractId: xasset.options.contractId,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, error, isLoading };
}