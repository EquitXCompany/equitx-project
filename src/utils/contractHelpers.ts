import { freighter } from "../wallet";

export async function authenticatedContractCall(contractMethod: any, params: any) {
  const publicKey = (await freighter.getAddress()).address;
  const tx = await contractMethod(params, { publicKey });
  let result = await tx.signAndSend({ signTransaction: freighter.signTransaction });
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