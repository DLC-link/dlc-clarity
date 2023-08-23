import { callReadOnlyFunction, contractPrincipalCV, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName } from '../config/common'

const functionName = "get-balance";

const txOptions = {
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'dlc-stablecoin',
  functionName: functionName,
  functionArgs: [
    // contractPrincipalCV('STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6', 'sample-contract-loan-v0-1')
    standardPrincipalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')
  ],
  senderAddress: contractAddress,
  network,
};

async function main() {
  const transaction: any = await callReadOnlyFunction(txOptions);
  console.log(cvToValue(transaction).value);
}

export const getBalance: ScriptFunction = {
  name: 'Get Balance',
  action: main
}


if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(args)
  main()
}
