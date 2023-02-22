import { callReadOnlyFunction, cvToValue, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

import { network, contractAddress, contractName, exampleContractAddress, exampleContractName } from '../config/common'
import { FunctionArgs } from "../models/function-args.interface";

const functionName = "get-last-loan-id";



async function main(args: FunctionArgs) {
  const txOptions = () => ({
    contractAddress: args.contractAddress || exampleContractAddress,
    contractName: args.contractName || exampleContractName,
    functionName: args.fname || functionName,
    functionArgs: [
    ],
    senderAddress: contractAddress,
    network,
  });

  const transaction: any = await callReadOnlyFunction(txOptions());
  const res = await cvToValue(transaction)
  console.log(res)
  return res;
}

export const getLastLoanID: ScriptFunction = {
  name: 'Get Last Loan ID',
  action: main
}

if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(args)
  main({fname: args[0], contractAddress: args[1], contractName: args[2], loanID: parseInt(args[3]), amount: parseInt(args[4])})
}
