import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'

const functionName = "get-payout-ratio";

const txOptions = {
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
    uintCV(1),
    uintCV(1793515510800)
  ],
  senderAddress: contractAddress,
  network,
};

async function main() {
  const transaction: any = await callReadOnlyFunction(txOptions);
  console.log(cvToValue(transaction));
}

export const getPayoutRatio: ScriptFunction = {
  name: 'Get Payout Ratio',
  action: main
}
