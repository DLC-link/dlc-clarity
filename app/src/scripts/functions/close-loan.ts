import { broadcastTransaction, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network, contractAddress } from "../config/common";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'close-loan';

function populateTxOptions(loanID?: number): SignedContractCallOptions {
  return {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: functionName,
    functionArgs: [
      uintCV(loanID || 1),
    ],
    senderKey: protocolPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000, //0.1STX
    anchorMode: 1,
  }
}

async function main(loanID?: number) {
  const transaction = await makeContractCall(populateTxOptions(loanID));
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const closeLoan: ScriptFunction = {
  name: 'Close Loan',
  action: main
}
