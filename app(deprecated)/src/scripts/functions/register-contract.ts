import {
  network,
  senderKey,
  contractAddress,
  contractName,
  exampleContractName,
  exampleContractAddress
} from "../config/common";

import {
  makeContractCall,
  broadcastTransaction,
  contractPrincipalCV,
} from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

// Replace this with the options required for your contract.
const txOptions = {
  contractAddress: contractAddress,
  contractName: contractName,
  functionName: "register-contract",
  functionArgs: [
    contractPrincipalCV("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", "usda-loans-v1-1")
  ],
  senderKey: senderKey,
  validateWithAbi: true,
  network,
  fee: 100000,
  anchorMode: 1,
};

async function main() {
  const transaction = await makeContractCall(txOptions);
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const registerContract: ScriptFunction = {
  name: 'Register Contract',
  action: main
}
