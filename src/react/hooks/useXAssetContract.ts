import { useState, useEffect } from 'react';
import { getContractBySymbol, XAssetContract } from '../../contracts/util';
import type { XAssetSymbol } from '../../contracts/contractConfig';

export function useXAssetContract(symbol: XAssetSymbol) {
  const [contract, setContract] = useState<XAssetContract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContractBySymbol(symbol)
      .then((contractInstance: XAssetContract) => {
        setContract(contractInstance);
        setLoading(false);
      });
  }, [symbol]);

  return { contract, loading };
}
