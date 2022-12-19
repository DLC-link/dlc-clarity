import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'

const functionName = "get-payout-ratio";

const txOptions = (loanID?: number) => ({
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
    uintCV(loanID || 1),
    uintCV(1793515510800)
  ],
  senderAddress: contractAddress,
  network,
});

async function main(loanID?: number) {
  const transaction: any = await callReadOnlyFunction(txOptions(loanID));
  console.log(cvToValue(transaction));
}

export const getPayoutRatio: ScriptFunction = {
  name: 'Get Payout Ratio',
  action: main
}
