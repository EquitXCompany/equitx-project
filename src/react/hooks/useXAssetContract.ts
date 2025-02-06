import { useState, useEffect } from 'react';
import { getContractBySymbol } from '../../contracts/util';
import type { XAssetSymbol } from '../../contracts/contractConfig';

export function useXAssetContract(symbol: XAssetSymbol) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContractBySymbol(symbol)
      .then(contractInstance => {
        setContract(contractInstance);
        setLoading(false);
      });
  }, [symbol]);

  return { contract, loading };
}