import {
  rpc,
} from "@stellar/stellar-sdk";
import { Client } from "xBTC";
import { networkPassphrase, rpcUrl } from "../contracts/util";

export async function approveXlmForInterestPayment(
  sacContractId: string,
  spenderAddress: string,
  userAccount: string,
  amount: string,
  signTransaction: any
) {
  const server = new rpc.Server(rpcUrl);
  const { sequence } = await server.getLatestLedger();

  const client = new Client({
    networkPassphrase,
    contractId: sacContractId,
    rpcUrl,
    publicKey: userAccount,
  });
  const tx = await client.approve({from: userAccount, spender: spenderAddress, amount: BigInt(amount), live_until_ledger: Number(sequence) + 100})
  return await tx.signAndSend({signTransaction});
}