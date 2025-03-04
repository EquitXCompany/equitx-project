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

export function useXAssetContractsForAll(assets: XAssetSymbol[]) {
  const [contracts, setContracts] = useState<Record<XAssetSymbol, XAssetContract>>(() => 
    Object.fromEntries(assets.map(symbol => [symbol, getContractBySymbol(symbol)])) as Record<XAssetSymbol, XAssetContract>
  );

  useEffect(() => {
    setContracts(
      Object.fromEntries(
        assets.map(symbol => [symbol, getContractBySymbol(symbol)])
      ) as Record<XAssetSymbol, XAssetContract>
    );
  }, [assets.join()]);

  return contracts;
}