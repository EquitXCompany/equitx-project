import { Keypair, TransactionBuilder, Operation, Networks } from "stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

const serverSecretKey = process.env.SERVER_SECRET_KEY;

if (!serverSecretKey) {
  throw new Error("SERVER_SECRET_KEY environment variable is not set");
}

function mnemonicToSeed(mnemonic: string): Buffer {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivationPath = "m/44'/148'/0'";
  const { key } = derivePath(derivationPath, seed.toString('hex'));
  return Buffer.from(key);
}


const seedBuffer = mnemonicToSeed(serverSecretKey);
const keypair = Keypair.fromRawEd25519Seed(seedBuffer);
const publicKey = keypair.publicKey();

async function getClient(contractId: string) {
  const Client = await import("xasset");
  return new Client.Client({
    networkPassphrase: process.env.SERVER_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',
    contractId,
    rpcUrl: process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    publicKey,
  });
}

export async function serverAuthenticatedContractCall(
  contractMethod: string,
  params: any,
  contractId: string,
) {
  let tx;
  let xasset = await getClient(contractId);
  switch (contractMethod) {
    case "freeze_cdp":
      tx = await xasset.freeze_cdp(params);
      break;
    case "liquidate_cdp":
      tx = await xasset.liquidate_cdp(params);
      break;
    default:
      throw new Error(`Unsupported contract method: ${contractMethod}`);
  }

  const signer = basicNodeSigner(
    keypair,
    process.env.STELLAR_NETWORK_PASSPHRASE ?? ""
  );

  try {
    let txResult = await tx.signAndSend({
      signTransaction: signer.signTransaction,
    });
    return {
      status: txResult.result.isOk() ? "SUCCESS" : "FAILED",
    };
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
}
