import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'

const functionName = "get-creator-loans";

const txOptions = {
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
    standardPrincipalCV('STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6')
  ],
  senderAddress: contractAddress,
  network,
};

async function main() {
  const transaction: any = await callReadOnlyFunction(txOptions);
  console.log(cvToValue(transaction));
}

export const getCreatorLoans: ScriptFunction = {
  name: 'Get Creator Loans',
  action: main
}
