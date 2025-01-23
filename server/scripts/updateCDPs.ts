import cron from 'node-cron';
import { DataSource } from 'typeorm';
import { CDP } from '../entity/CDP';
import { LastQueriedTimestamp } from '../entity/LastQueriedTimestamp';
import ormconfig from '../config/ormconfig';
import BigNumber from 'bignumber.js';
import dotenv from 'dotenv';
import axios from 'axios';
import xasset from 'xasset';
import { serverAuthenticatedContractCall } from '../utils/serverContractHelpers';


dotenv.config();

const AppDataSource = new DataSource(ormconfig);

const apiClient = axios.create({
  baseURL: 'https://your-retroshades-endpoint.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.RETROSHADE_API_TOKEN}`
  }
});

interface RetroShadeCDP {
  id: string;
  contract_id: string;
  xlm_deposited: string;
  asset_lent: string;
  status: string[];
  timestamp: number;
}

interface CDPConfig {
  [key: string]: string;
}

const cdpConfig: CDPConfig = {
  'USDC': 'cdp1a16c60a7890c14872ae7c3a025c31a9',
  'ETH': 'cdp2b27d71b8901d25983be4c4b036d42b0',
  // Add more asset symbols and their corresponding table names
};

async function fetchCDPs(tableName: string, lastQueriedTimestamp: number): Promise<RetroShadeCDP[]> {
  try {
    const { data } = await apiClient.post('/retroshadesv1', {
      query: `SELECT * FROM ${tableName} WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp DESC`
    });

    const latestEntries = new Map<string, RetroShadeCDP>();
    data.forEach((item: RetroShadeCDP) => {
      if (!latestEntries.has(item.id) || item.timestamp > latestEntries.get(item.id)!.timestamp) {
        latestEntries.set(item.id, item);
      }
    });

    return Array.from(latestEntries.values());
  } catch (error) {
    console.error('Error fetching CDPs:', error);
    throw error;
  }
}

async function updateCDPsInDatabase(cdps: RetroShadeCDP[]): Promise<void> {
  const cdpRepository = AppDataSource.getRepository(CDP);

  for (const cdp of cdps) {
    const [asset_symbol, addr] = cdp.contract_id.split(':');
    
    await cdpRepository.save({
      asset_symbol,
      addr,
      xlm_dep: new BigNumber(cdp.xlm_deposited).toString(),
      asset_lnt: new BigNumber(cdp.asset_lent).toString(),
      status: cdp.status[0] === 'active' ? 1 : 0,
    });
  }
}

async function getLastQueriedTimestamp(assetSymbol: string): Promise<number> {
  const timestampRepository = AppDataSource.getRepository(LastQueriedTimestamp);
  const lastTimestamp = await timestampRepository.findOne({ where: { asset_symbol: assetSymbol } });
  return lastTimestamp ? lastTimestamp.timestamp : 0;
}

async function updateLastQueriedTimestamp(assetSymbol: string, timestamp: number): Promise<void> {
  const timestampRepository = AppDataSource.getRepository(LastQueriedTimestamp);
  await timestampRepository.save({
    asset_symbol: assetSymbol,
    timestamp: timestamp,
  });
}

async function updateCDPs() {
  try {
    for (const [assetSymbol, tableName] of Object.entries(cdpConfig)) {
      const lastTimestamp = await getLastQueriedTimestamp(assetSymbol);
      const cdps = await fetchCDPs(tableName, lastTimestamp);
      await updateCDPsInDatabase(cdps);
      
      if (cdps.length > 0) {
        const newLastTimestamp = Math.max(...cdps.map(cdp => cdp.timestamp));
        await updateLastQueriedTimestamp(assetSymbol, newLastTimestamp);
      }
      
      console.log(`Updated ${cdps.length} CDPs for ${assetSymbol}`);

      // Process insolvent and frozen CDPs
      for (const cdp of cdps) {
        const [, lender] = cdp.contract_id.split(':');
        
        if (cdp.status[0] === 'insolvent') {
          console.log(`Attempting to freeze insolvent CDP for lender: ${lender}`);
          try {
            const result = await serverAuthenticatedContractCall('freeze_cdp', { lender });
            console.log(`Successfully frozen CDP for lender: ${lender}. Transaction hash: ${result.hash}`);
          } catch (error) {
            console.error(`Error freezing CDP for lender ${lender}:`, error);
          }
        } else if (cdp.status[0] === 'frozen') {
          console.log(`Attempting to liquidate frozen CDP for lender: ${lender}`);
          try {
            const result = await serverAuthenticatedContractCall('liquidate_cdp', { lender });
            console.log(`Successfully liquidated CDP for lender: ${lender}. Transaction hash: ${result.hash}`);
          } catch (error) {
            console.error(`Error liquidating CDP for lender ${lender}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating CDPs:', error);
  }
}

export function startCDPUpdateJob() {
  AppDataSource.initialize()
    .then(() => {
      console.log('Database connection established for CDP update job');
      
      // Run the job every 5 minutes
      cron.schedule('*/5 * * * *', updateCDPs);
      
      // Run the job immediately on startup
      updateCDPs();
    })
    .catch((error) => console.log('TypeORM connection error in CDP update job:', error));
}