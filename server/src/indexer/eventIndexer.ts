import { rpc, scValToNative, StrKey, xdr } from "@stellar/stellar-sdk";
import { AppDataSource } from "../ormconfig"; // Adjust path
import { AssetService } from "../services/assetService"; // Adjust path
import BigNumber from "bignumber.js";
import { IndexerState } from "../entity/IndexerState";
import { CDPStatus } from "../entity/CDP";

const RPC_URL = process.env.STELLAR_RPC_URL;
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE;
const CONTRACT_FILTER_BATCH_SIZE = 5;

export class EventIndexer {
  private sorobanServer: rpc.Server;
  private knownContracts: Map<
    string,
    { wasmHash: string; contractId: string; assetSymbol: string }
  >;

  private LEDGER_BATCH_SIZE = 10000;
  private EVENT_BATCH_SIZE = 100;
  private LEDGER_QUERY_RETRY_DELAY = 5000; // 5 s
  private NEW_LEDGERS_INTERVAL = 300000; // 300 s

  constructor() {
    if (!RPC_URL) {
      throw new Error("Environment variable STELLAR_RPC_URL must be set");
    }
    this.sorobanServer = new rpc.Server(RPC_URL);
    this.knownContracts = new Map();
  }

  async init() {
    const assetService = await AssetService.create();
    const assets = await assetService.findAllWithPools();
    assets.forEach((asset) => {
      if (asset.liquidityPool) {
        this.knownContracts.set(asset.liquidityPool.pool_address, {
          wasmHash: asset.liquidityPool.mercury_wasm_hash,
          contractId: asset.liquidityPool.pool_address,
          assetSymbol: asset.symbol,
        });
      }
    });
  }

  async start() {
    await this.init();
    const stateRepo = AppDataSource.getRepository(IndexerState);
    let state = await stateRepo.findOne({ where: {} });
    if (!state) {
      state = new IndexerState();
      await stateRepo.save(state);
    }

    console.log(`Starting indexer from ledger ${state.last_ledger}`);

    // Get current ledger to know where to stop
    const latestLedger = await this.sorobanServer.getLatestLedger();
    let currentStartLedger = state.last_ledger + 1;

    // Validate that our start ledger is within the RPC server's retention period
    currentStartLedger =
      await this.validateAndAdjustStartLedger(currentStartLedger);

    // Update state if we had to adjust the start ledger
    if (currentStartLedger !== state.last_ledger + 1) {
      console.log(
        `Adjusted start ledger to ${currentStartLedger} due to RPC retention limits`
      );
      state.last_ledger = currentStartLedger - 1;
      await stateRepo.save(state);
    }

    while (currentStartLedger < latestLedger.sequence) {
      try {
        const endLedger = Math.min(
          currentStartLedger + this.LEDGER_BATCH_SIZE,
          latestLedger.sequence
        );

        console.log(
          `Processing events from ledger ${currentStartLedger} to ${endLedger}`
        );

        // Get events for all our contracts in this ledger range (single call)
        const contractIds = Array.from(this.knownContracts.keys());
        await this.processEventsForContracts(
          contractIds,
          currentStartLedger,
          endLedger
        );

        // Update state only after successful processing
        state.last_ledger = endLedger;
        await stateRepo.save(state);

        currentStartLedger = endLedger + 1;

        // Small delay to avoid overwhelming the RPC
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Error processing batch from ledger ${currentStartLedger}:`,
          error
        );
        // Retry after delay (outer loop will retry the batch)
        await new Promise((resolve) =>
          setTimeout(resolve, this.LEDGER_QUERY_RETRY_DELAY)
        );
      }
    }

    // Start continuous monitoring
    this.startContinuousMonitoring(state);
  }

  async validateAndAdjustStartLedger(
    requestedStartLedger: number
  ): Promise<number> {
    try {
      // Try a minimal query to test if the start ledger is acceptable
      const contractIds = Array.from(this.knownContracts.keys());
      if (contractIds.length === 0) {
        // If no contracts, just return the requested ledger
        return requestedStartLedger;
      }

      // Test with just one contract and a single ledger to minimize the query
      await this.retryRpc(
        () =>
          this.sorobanServer.getEvents({
            startLedger: requestedStartLedger,
            endLedger: requestedStartLedger,
            filters: [
              {
                type: "contract",
                contractIds: [contractIds[0]],
              },
            ],
            limit: 1,
          }),
        1
      );

      // If no error, the start ledger is valid
      return requestedStartLedger;
    } catch (error: any) {
      // Check if it's a ledger range error
      if (
        error.code === -32600 &&
        error.message?.includes("startLedger must be within the ledger range")
      ) {
        // Extract the minimum ledger from the error message
        const match = error.message.match(/ledger range: (\d+) - (\d+)/);
        if (match) {
          const minLedger = parseInt(match[1]);
          console.warn(
            `Start ledger ${requestedStartLedger} is outside retention period. Adjusting to minimum available ledger: ${minLedger}`
          );
          return minLedger + 5; // add 5 ledgers to ensure we are within retention period
        }
      }

      // If it's a different error or we can't parse it, throw it
      throw error;
    }
  }

  async startContinuousMonitoring(state: IndexerState) {
    const stateRepo = AppDataSource.getRepository(IndexerState);

    setInterval(async () => {
      try {
        const latestLedger = await this.retryRpc(() =>
          this.sorobanServer.getLatestLedger()
        );

        if (latestLedger.sequence > state.last_ledger) {

          console.log(
            `Processing events from ledger ${state.last_ledger + 1} to ${latestLedger.sequence}`
          );
          const contractIds = Array.from(this.knownContracts.keys());
          await this.processEventsForContracts(
            contractIds,
            state.last_ledger + 1,
            latestLedger.sequence
          );

          // Update only after success
          state.last_ledger = latestLedger.sequence;
          await stateRepo.save(state);
        }
      } catch (error) {
        console.error("Error in continuous monitoring:", error);
      }
    }, this.NEW_LEDGERS_INTERVAL);
  }

  async processEventsForContracts(
    contractIds: string[],
    startLedger: number,
    endLedger: number
  ) {
    // Process contracts in batches of 5 (RPC filter limitation)
    for (let i = 0; i < contractIds.length; i += CONTRACT_FILTER_BATCH_SIZE) {
      const contractIdsBatch = contractIds.slice(
        i,
        i + CONTRACT_FILTER_BATCH_SIZE
      );

      let cursor: string | undefined = undefined;
      do {
        try {
          // Build the request object conditionally
          const requestParams: any = {
            filters: [
              {
                type: "contract",
                contractIds: contractIdsBatch,
              },
            ],
            limit: this.EVENT_BATCH_SIZE,
          };

          // Only set ledger range on the first request (when cursor is undefined)
          if (!cursor) {
            requestParams.startLedger = startLedger;
            requestParams.endLedger = endLedger;
          } else {
            // Use cursor for subsequent requests
            requestParams.cursor = cursor;
          }

          const eventsResponse = await this.retryRpc(() =>
            this.sorobanServer.getEvents(requestParams)
          );

          for (const event of eventsResponse.events) {
            // Handle undefined and convert Contract to string
            const contractIdStr = event.contractId?.contractId();
            if (!contractIdStr) {
              console.warn(
                `Unexpected event without contractId (filtered by ${contractIdsBatch.join(", ")}): ${JSON.stringify(event)}`
              );
              continue;
            }
            const contractInfo = this.knownContracts.get(contractIdStr);
            if (contractInfo) {
              await this.processContractEvent(event, contractInfo);
            } else {
              console.warn(
                `Contract info not found for ID: ${contractIdStr} (filtered by ${contractIdsBatch.join(", ")})`
              );
            }
          }

          if(eventsResponse.events.length > 0 && eventsResponse.events[-1]!!) {
            cursor = eventsResponse.events[-1].pagingToken;
          }
          else {
            break;
          }
        } catch (error) {
          console.error(
            `Error getting events for ledgers ${startLedger}-${endLedger} and contracts ${contractIdsBatch.join(", ")}:`,
            error
          );
          throw error; // Propagate to outer try-catch for batch retry
        }
      } while (true);
    }
  }

  async processContractEvent(
    event: rpc.Api.EventResponse,
    contractInfo: { wasmHash: string; contractId: string; assetSymbol: string }
  ) {
    try {
      const topics = event.topic.map((t) => scValToNative(t));
      const data = scValToNative(event.value);

      const eventType = typeof topics[0] === "string" ? topics[0] : null; // Add type guard
      switch (eventType) {
        case "CDP":
          const CDPEvent = {
            event_id: event.id,
            contract_id: contractInfo.contractId,
            lender: data.id,
            xlm_deposited: data.xlm_deposited.toString(),
            asset_lent: data.asset_lent.toString(),
            status: this.mapStatusToEnum(data.status),
            timestamp: data.timestamp.toString(),
            accrued_interest: data.accrued_interest.toString(),
            interest_paid: data.interest_paid.toString(),
            last_interest_time: data.last_interest_time.toString(),
            ledger: event.ledger,
          };
          await this.insertEvents("cdp_event", CDPEvent);
          break;

        case "StakePosition":
          const StakeEvent = {
            event_id: event.id,
            contract_id: contractInfo.contractId,
            address: data.id,
            xasset_deposit: data.xasset_deposit.toString(),
            product_constant: data.product_constant.toString(),
            compounded_constant: data.compounded_constant.toString(),
            rewards_claimed: data.rewards_claimed.toString(),
            epoch: data.epoch.toString(),
            ledger: event.ledger,
            timestamp: data.timestamp.toString(),
          };
          await this.insertEvents("stake_position_event", StakeEvent);
          break;

        case "Liquidation":
          const LiqEvent = {
            event_id: event.id,
            contract_id: contractInfo.contractId,
            cdp_id: data.cdp_id,
            collateral_liquidated: data.collateral_liquidated.toString(),
            principal_repaid: data.principal_repaid.toString(),
            accrued_interest_repaid: data.accrued_interest_repaid.toString(),
            collateral_applied_to_interest:
              data.collateral_applied_to_interest.toString(),
            collateralization_ratio: data.collateralization_ratio.toString(),
            xlm_price: data.xlm_price.toString(),
            xasset_price: data.xasset_price.toString(),
            ledger: event.ledger,
            timestamp: data.timestamp.toString(),
          };
          await this.insertEvents("liquidation_event", LiqEvent);
          break;

        default:
          console.warn(`Unknown event type ${eventType}`);
          break;
      }
    } catch (error) {
      console.error("Error processing contract event:", error);
    }
  }

  private mapStatusToEnum(status: any): CDPStatus {
    if (Array.isArray(status)) {
      status = status[0];
    }
    
    if (typeof status === 'string') {
      // Map string values to enum
      switch (status.toLowerCase()) {
        case 'open': return CDPStatus.Open;
        case 'insolvent': return CDPStatus.Insolvent;
        case 'frozen': return CDPStatus.Frozen;
        case 'closed': return CDPStatus.Closed;
        default: return CDPStatus.Open;
      }
    }
    
    if (typeof status === 'number' || typeof status === 'bigint') {
      return Number(status) as CDPStatus;
    }

    return CDPStatus.Open;
  }

  async insertEvents(tableName: string, data: any) {
    const columns = Object.keys(data).join(", ");
    const placeholders = Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    const values = Object.values(data);
    await AppDataSource.query(
      `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (event_id) DO NOTHING`,
      values
    );
  }

  // Retry RPC calls with exponential backoff
  async retryRpc<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        console.warn(`RPC retry ${attempt}/${maxRetries} after error:`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (attempt === maxRetries) throw error;
      }
    }
    throw new Error("Unreachable");
  }
}
