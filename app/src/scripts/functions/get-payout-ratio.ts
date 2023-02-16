import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'
import { FunctionArgs } from "../models/function-args.interface";

const functionName = "get-payout-ratio";

async function main(args: FunctionArgs) {
  const txOptions = () => ({
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: functionName,
    functionArgs: [
      uintCV(args.loanID || 1),
      uintCV(1793515510800)
    ],
    senderAddress: contractAddress,
    network,
  });
  const transaction: any = await callReadOnlyFunction(txOptions());
  console.log(cvToValue(transaction));
}

export const getPayoutRatio: ScriptFunction = {
  name: 'Get Payout Ratio',
  action: main
}
