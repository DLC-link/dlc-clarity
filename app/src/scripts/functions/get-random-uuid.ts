import { callReadOnlyFunction, cvToValue, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName } from '../config/common'

const functionName = "get-random-uuid";

const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: functionName,
  functionArgs: [
    uintCV(0)
  ],
  senderAddress: contractAddress,
  network,
};

async function main() {
  const transaction: any = await callReadOnlyFunction(txOptions);
  console.log(cvToValue(transaction));
}

export const getUUID: ScriptFunction = {
  name: 'Get UUID',
  action: main
}
