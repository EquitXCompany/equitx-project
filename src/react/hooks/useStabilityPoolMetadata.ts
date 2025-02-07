import { useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import { getContractBySymbol } from '../../contracts/util';
import type { XAssetSymbol } from '../../contracts/contractConfig';
import { ErrorMessage, i128, Result } from '@stellar/stellar-sdk/contract';

type lastPriceResult = {result: Result<{price: i128}, ErrorMessage>};

interface StabilityPoolMetadata {
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  min_ratio: number;
  symbolAsset: XAssetSymbol;
  contractId: string;
}

export function useStabilityPoolMetadata(assetSymbol: XAssetSymbol) {
  const [data, setData] = useState<StabilityPoolMetadata | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contract = await getContractBySymbol(assetSymbol);
        
        const tx = await contract.minimum_collateralization_ratio();
        const lastpriceXLM = new BigNumber(await contract.lastprice_xlm().then((t: lastPriceResult) => {
          if (t.result.isOk()) {
            return t.result.unwrap().price.toString();
          } else {
            throw new Error("Failed to fetch XLM price");
          }
        })).div(10 ** 14);

        const lastpriceAsset = new BigNumber(await contract.lastprice_asset().then((t: lastPriceResult) => {
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
          symbolAsset: assetSymbol,
          contractId: contract.options.contractId,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [assetSymbol]);

  return { data, error, isLoading };
}
