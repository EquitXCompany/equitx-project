import type { Result } from '@stellar/stellar-sdk/contract';
import { getAddress, signTransaction } from '@stellar/freighter-api';


export async function authenticatedContractCall(contractMethod: any, params: any) {
  const publicKey = (await getAddress()).address;
  const tx = await contractMethod(params, { publicKey });
  let result = await tx.signAndSend({ signTransaction: signTransaction });
  return result;
}

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'open':
      return '#f2e8c9'; // --color-cream
    case 'closed':
      return '#d1d8e0'; // light grey
    case 'insolvent':
      return '#c0392b'; // --color-red
    case 'frozen':
      return '#e67e22'; // --color-orange
    default:
      return '#f2e8c9'; // --color-cream
  }
};

export function unwrapResult<T>(result: Result<T>, errorMessage: string): T {
  console.log(result);
  if (result.isOk()) {
    return result.unwrap();
  } else {
    throw new Error(errorMessage);
  }
}