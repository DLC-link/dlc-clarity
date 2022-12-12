import { broadcastTransaction, makeContractCall, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network } from "../config/common";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'attempt-liquidate';

function populateTxOptions() {
  return {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: functionName,
    functionArgs: [
      uintCV(process.argv.slice(2)[0] || 1)
    ],
    senderKey: protocolPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000, //0.1STX
    anchorMode: 1,
  }
}

async function main() {
  const transaction = await makeContractCall(populateTxOptions());
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const attemptLiquidate: ScriptFunction = {
  name: 'Attempt Liquidate',
  action: main
}
