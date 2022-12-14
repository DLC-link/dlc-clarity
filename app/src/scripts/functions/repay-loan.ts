import { broadcastTransaction, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network } from "../config/common";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'repay-loan';

const _contractAddress = exampleContractAddress; // NOTE: this shoudl be the creator
const _postConditionCode = FungibleConditionCode.GreaterEqual;
const _postConditionAmount = 1;
const _assetAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const _assetContractName = 'dlc-stablecoin';
const _assetName = 'dlc-stablecoin';
const _fungibleAssetInfo = createAssetInfo(_assetAddress, _assetContractName, _assetName);

const contractFungiblePostCondition = makeStandardFungiblePostCondition(
  _contractAddress,
  _postConditionCode,
  _postConditionAmount,
  _fungibleAssetInfo
);

function populateTxOptions(loanID?: number): SignedContractCallOptions {
  return {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: functionName,
    functionArgs: [
      uintCV(loanID || 0)
    ],
    // postConditions: [contractFungiblePostCondition],
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

export const repayLoan: ScriptFunction = {
  name: 'Repay Loan',
  action: main
}
