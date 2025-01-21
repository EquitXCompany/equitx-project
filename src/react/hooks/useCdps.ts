import { useQuery } from 'react-query';
import type { CDP } from "xasset";
import { apiClient } from '../../utils/apiClient';

async function fetchCdps(lastQueriedTimestamp: number): Promise<CDP[]> {
  try {
    const { data } = await apiClient.post('/retroshadesv1', {
      query: `SELECT * FROM cdp0d76cf6277eef1493c34555cdd18c23c WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp DESC`
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
      id: item.id,
      lender: item.contract_id,
      xlmDeposited: BigInt(item.xlm_deposited),
      assetLent: BigInt(item.asset_lent),
      collateralizationRatio: 0, // Calculation needed based on your business logic
      status: item.status[0],
      createdAt: new Date(item.timestamp * 1000).toISOString(),
      updatedAt: new Date(item.timestamp * 1000).toISOString(),
    }));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function useCdps(lastQueriedTimestamp: number) {
  return useQuery(['cdps', lastQueriedTimestamp], () => fetchCdps(lastQueriedTimestamp), {
    // Add any additional options here, such as refetch interval, etc.
  });
}