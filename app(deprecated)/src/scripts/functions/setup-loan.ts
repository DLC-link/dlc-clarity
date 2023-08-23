import {
  unixTimeStamp,
  protocolPrivateKey,
  exampleContractAddress,
  exampleContractName,
  network,
  senderKey
} from "../config/common";

import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  AnchorMode,
} from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";
import { FunctionArgs } from "../models/function-args.interface";

async function main(args: FunctionArgs) {

  const functionName = args.fname || "setup-loan";
  const txOptions = {
    contractAddress: args.contractAddress || exampleContractAddress,
    contractName: args.contractName || exampleContractName,
    functionName: functionName,
    // NOTE: arkadiko contract also takes different args so this is weird
    functionArgs: [
      uintCV(100000000),     // btc-deposit in Sats
      uintCV(14000),         // liquidation-ratio, two decimals precison
      uintCV(1000),          // liquidation-fee, two decimals precision
      uintCV(unixTimeStamp), // emergency-refund-time
    ],
    senderKey: senderKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: AnchorMode.Any,
  };

  const transaction = await makeContractCall(txOptions);
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const setupLoan: ScriptFunction = {
  name: 'Setup Loan',
  action: main
}

if (require.main === module) {
  const args = process.argv.slice(2);
  main({fname: args[0], contractAddress: args[1], contractName: args[2]})
}
