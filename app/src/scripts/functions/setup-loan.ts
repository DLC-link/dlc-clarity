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
} from "@stacks/transactions";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = "setup-loan";

const txOptions = {
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
    // uintCV(150000),       // loan amount in pennies
    uintCV(10000000),     // btc-deposit in Sats
    uintCV(14000),         // liquidation-ratio, two decimals precison
    uintCV(1000),          // liquidation-fee, two decimals precision
    uintCV(unixTimeStamp), // emergency-refund-time
    // uintCV(10000000000000000000000), // emergency-refund-time
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

export const setupLoan: ScriptFunction = {
  name: 'Setup Loan',
  action: main
}
