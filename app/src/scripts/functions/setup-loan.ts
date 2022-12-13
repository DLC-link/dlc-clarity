import {
  unixTimeStamp,
  protocolPrivateKey,
  exampleContractAddress,
  exampleContractName,
  network
} from "../config/common";

import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
} from "@stacks/transactions";
import { StacksMocknet } from "@stacks/network";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = "setup-loan";

// const network = new StacksMocknet({url: "http://stx-btc1.dlc.link:3999"});

const txOptions = {
  contractAddress: exampleContractAddress,
  contractName: exampleContractName,
  functionName: functionName,
  functionArgs: [
    uintCV(150000),       // loan amount in pennies
    uintCV(10000000),     // btc-deposit in Sats
    uintCV(14000),         // liquidation-ratio, two decimals precison
    uintCV(1000),          // liquidation-fee, two decimals precision
    uintCV(unixTimeStamp), // emergency-refund-time
  ],
  senderKey: protocolPrivateKey,
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
