import { useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import { getContractBySymbol } from '../../contracts/util';
import { contractMapping, type XAssetSymbol } from '../../contracts/contractConfig';
import { ErrorMessage, i128, Result } from '@stellar/stellar-sdk/contract';

type lastPriceResult = {result: Result<{price: i128}, ErrorMessage>};

export interface StabilityPoolMetadata {
  lastpriceXLM: BigNumber;
  lastpriceAsset: BigNumber;
  min_ratio: number;
  symbolAsset: XAssetSymbol;
  contractId: string;
  interestRate: number;
}

export function useStabilityPoolMetadata(assetSymbol: XAssetSymbol) {
  const [data, setData] = useState<StabilityPoolMetadata | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contract = getContractBySymbol(assetSymbol);
        
        const tx = await contract.minimum_collateralization_ratio();
        const interestRate = await contract.get_interest_rate();
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
          interestRate: interestRate.result,
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

type AllStabilityPoolMetadata = {
  [key in XAssetSymbol]?: StabilityPoolMetadata;
};

export function useAllStabilityPoolMetadata() {
  const [allData, setAllData] = useState<AllStabilityPoolMetadata>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Extract the fetching logic into a separate function that can be called on-demand
  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await Promise.all(
        Object.keys(contractMapping).map(async (symbol) => {
          const assetSymbol = symbol as XAssetSymbol;
          const contract = getContractBySymbol(assetSymbol);

          const [minRatio, xlmPrice, assetPrice, interestRate] = await Promise.all([
            contract.minimum_collateralization_ratio(),
            contract.lastprice_xlm(),
            contract.lastprice_asset(),
            contract.get_interest_rate(),
          ]);

          const lastpriceXLM = new BigNumber(
            ((xlmPrice as lastPriceResult).result.isOk() 
              ? (xlmPrice as lastPriceResult).result.unwrap().price.toString()
              : "0")
          ).div(10 ** 14);

          const lastpriceAsset = new BigNumber(
            ((assetPrice as lastPriceResult).result.isOk()
              ? (assetPrice as lastPriceResult).result.unwrap().price.toString()
              : "0")
          ).div(10 ** 14);

          return {
            symbol: assetSymbol,
            data: {
              lastpriceXLM,
              lastpriceAsset,
              interestRate: interestRate.result,
              min_ratio: minRatio.result,
              symbolAsset: assetSymbol,
              contractId: contract.options.contractId,
            },
          };
        })
      );

      const newData = results.reduce((acc, { symbol, data }) => {
        acc[symbol] = data;
        return acc;
      }, {} as AllStabilityPoolMetadata);

      setAllData(newData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Call fetchAllData once on component mount
  useEffect(() => {
    fetchAllData();
  }, []); 

  // Return the refetch function along with the data
  return {
    data: allData,
    isLoading,
    error,
    refetch: fetchAllData  // Expose the refetch function
  };
}