import { Keypair, TransactionBuilder, Operation, Networks } from 'stellar-sdk';
import { basicNodeSigner } from 'stellar-sdk/lib/contract';
import xasset from '../../src/contracts/xasset';

const serverSecretKey = process.env.SERVER_SECRET_KEY;
if (!serverSecretKey) {
  throw new Error('SERVER_SECRET_KEY environment variable is not set');
}
const keypair = Keypair.fromSecret(serverSecretKey);

export async function serverAuthenticatedContractCall(contractMethod: string, params: any) {
  
  let tx;
  switch (contractMethod) {
    case 'freeze_cdp':
      tx = xasset.freeze_cdp(params, { publicKey });
      break;
    case 'liquidate_cdp':
      tx = xasset.liquidate_cdp(params, { publicKey });
      break;
    default:
      throw new Error(`Unsupported contract method: ${contractMethod}`);
  }

  const signer = basicNodeSigner(keypair, process.env.STELLAR_NETWORK_PASSPHRASE);

  try {
    let txResult = await tx.signAndSend({ signTransaction: signer.signTransaction });
    return {
      hash: txResult.hash,
      status: txResult.successful ? 'SUCCESS' : 'FAILED',
    };
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw error;
  }
}

