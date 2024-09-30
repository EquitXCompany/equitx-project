import { freighter } from "../wallet";

export async function authenticatedContractCall(contractMethod: any, params: any) {
  const tx = await contractMethod(params, { publicKey: params.lender });
  let result = await tx.signAndSend({ signTransaction: freighter.signTransaction });
  return result;
}
