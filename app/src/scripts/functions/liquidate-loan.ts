import { broadcastTransaction, makeContractCall, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network } from "../config/common";
import { FunctionArgs } from "../models/function-args.interface";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'attempt-liquidate';

async function main(args: FunctionArgs) {
  function populateTxOptions() {
    return {
      contractAddress: exampleContractAddress,
      contractName: exampleContractName,
      functionName: functionName,
      functionArgs: [
        uintCV(args.loanID || 2)
      ],
      senderKey: protocolPrivateKey,
      validateWithAbi: true,
      network,
      fee: 100000, //0.1STX
      anchorMode: 1,
    }
  }
  const transaction = await makeContractCall(populateTxOptions());
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const attemptLiquidate: ScriptFunction = {
  name: 'Attempt Liquidate',
  action: main
}


if (require.main === module) {
  const args = process.argv.slice(2);
  main({fname: args[0], contractAddress: args[1], contractName: args[2], loanID: parseInt(args[3]), amount: parseInt(args[4])})
}
