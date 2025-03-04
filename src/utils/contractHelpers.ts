import type { Result } from '@stellar/stellar-sdk/contract';
import { getAddress, signTransaction } from '@stellar/freighter-api';


export async function authenticatedContractCall(contractMethod: any, params: any) {
  const publicKey = (await getAddress()).address;
  const tx = await contractMethod(params, { publicKey });
  let result = await tx.signAndSend({ signTransaction: signTransaction });
  return result;
}

export const getStatusColor = (status: string, isDarkMode?: boolean): string => {
  const mode = isDarkMode ? 'dark' : 'light';
  console.log(mode)
  
  switch (status.toLowerCase()) {
    case 'open':
      return mode === 'dark' ? '#f0e6c3' : '#8a7d52'; // Light for dark mode, dark for light mode
    case 'closed':
      return mode === 'dark' ? '#e2e8f0' : '#4a5568'; // Light for dark mode, dark for light mode
    case 'insolvent':
      return mode === 'dark' ? '#fc8181' : '#9b2c2c'; // Light red for dark mode, dark red for light mode
    case 'frozen':
      return mode === 'dark' ? '#fbd38d' : '#9c4221'; // Light orange for dark mode, dark orange for light mode
    default:
      return mode === 'dark' ? '#f0e6c3' : '#8a7d52'; // Light for dark mode, dark for light mode
  }
};

export function unwrapResult<T>(result: Result<T>, errorMessage: string): T {
  if (result.isOk()) {
    return result.unwrap();
  } else {
    throw new Error(errorMessage);
  }
}