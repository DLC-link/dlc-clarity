import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'
import { FunctionArgs } from "../models/function-args.interface";

const functionName = "check-liquidation";

async function main(args: FunctionArgs) {
  const txOptions = () => ({
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: functionName,
    functionArgs: [
      uintCV(args.loanID || 2),
      uintCV(2381168816970)
    ],
    senderAddress: contractAddress,
    network,
  });
  const transaction: any = await callReadOnlyFunction(txOptions());
  console.log(cvToValue(transaction));
}

export const checkLiquidation: ScriptFunction = {
  name: 'Check Liquidation',
  action: main
}

if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(args)
  main({fname: args[0], contractAddress: args[1], contractName: args[2], loanID: parseInt(args[3]), amount: parseInt(args[4])})
}
