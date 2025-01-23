import { useQuery, type UseQueryResult } from 'react-query';
import { apiClient } from '../../utils/apiClient';
import BigNumber from 'bignumber.js';

export type IndexedCDP = {
  lender: string;
  contract_id: string;
  xlm_deposited: BigNumber;
  asset_lent: BigNumber;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};
export function CalculateCollateralizationRatio(cdp: IndexedCDP, xlm_price: BigNumber, xasset_price: BigNumber): BigNumber {
  if (cdp.asset_lent === BigNumber(0) || xasset_price === BigNumber(0)) {
    return BigNumber(Infinity);
  }
  return (cdp.xlm_deposited.times(xlm_price)).div(cdp.asset_lent.times(xasset_price));
}

async function fetchCdps(lastQueriedTimestamp: number): Promise<IndexedCDP[]> {
  try {
    const { data } = await apiClient.post('/retroshadesv1', {
      query: `SELECT * FROM cdp1a16c60a7890c14872ae7c3a025c31a9 WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp DESC`
    });

    // Create a map to store the latest entry for each unique id
    const latestEntries = new Map<string, any>();

    data.forEach((item: any) => {
      if (!latestEntries.has(item.id) || item.timestamp > latestEntries.get(item.id).timestamp) {
        latestEntries.set(item.id, item);
      }
    });

    // Transform the data into the CDP type
    return Array.from(latestEntries.values()).map((item: any) => ({
      lender: item.id,
      contract_id: item.contract_id,
      xlm_deposited: BigNumber(item.xlm_deposited),
      asset_lent: BigNumber(item.asset_lent),
      status: item.status[0],
      createdAt: new Date(item.timestamp * 1000),
      updatedAt: new Date(item.timestamp * 1000),
    }));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function useCdps(lastQueriedTimestamp: number): UseQueryResult<IndexedCDP[], Error> {
  return useQuery<IndexedCDP[], Error>(
    ['cdps', lastQueriedTimestamp],
    () => fetchCdps(lastQueriedTimestamp),
    {
      refetchInterval: 300000, // Refetch every 5 minutes (300,000 milliseconds)
      retry: 3,               // Retry failed request up to 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with cap at 30 seconds
    }
  );
}