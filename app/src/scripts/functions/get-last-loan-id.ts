import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'

const functionName = "get-last-loan-id";

const txOptions = () => ({
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
  ],
  senderAddress: contractAddress,
  network,
});

async function main() {
  const transaction: any = await callReadOnlyFunction(txOptions());
  return await cvToValue(transaction);
}

export const getLastLoanID: ScriptFunction = {
  name: 'Get Last Loan ID',
  action: main
}
