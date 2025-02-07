import { useState, useEffect } from 'react';
import { getContractBySymbol, XAssetContract } from '../../contracts/util';
import type { XAssetSymbol } from '../../contracts/contractConfig';

export function useXAssetContract(symbol: XAssetSymbol) {
  const [contract, setContract] = useState<XAssetContract>(() => getContractBySymbol(symbol));
  useEffect(() => {
    setContract(getContractBySymbol(symbol));
  }, [symbol]);

  return { contract, loading: false };
}