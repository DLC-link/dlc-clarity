import {
  network,
  senderKey,
  contractAddress,
  contractName,
} from "../config/common";

import {
  makeContractCall,
  broadcastTransaction,
  bufferCV,
  trueCV,
} from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = "set-trusted-oracle";

const buffer = Buffer.from(
  "03009dd87eb41d96ce8ad94aa22ea8b0ba4ac20c45e42f71726d6b180f93c3f298",
  "hex"
);

// Replace this with the options required for your contract.
const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: functionName,
  functionArgs: [bufferCV(buffer), trueCV()],
  senderKey: senderKey,
  validateWithAbi: true,
  network,
  fee: 100000, //0.1STX
  anchorMode: 1,
};

async function main() {
  const transaction = await makeContractCall(txOptions);
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("Broadcast response: ", broadcastResponse);
}

export const setOracle: ScriptFunction = {
  name: 'Set Oracle',
  action: main
}
