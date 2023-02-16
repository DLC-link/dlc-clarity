import { broadcastTransaction, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network, contractAddress, senderKey } from "../config/common";
import { FunctionArgs } from "../models/function-args.interface";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'borrow';
const amount = 13000000000;

const _contractAddress = exampleContractAddress;
const _postConditionCode = FungibleConditionCode.GreaterEqual;
const _postConditionAmount = amount;
const _assetAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const _assetContractName = 'dlc-stablecoin';
const _assetName = 'dlc-stablecoin';
const _fungibleAssetInfo = createAssetInfo(_assetAddress, _assetContractName, _assetName);

const contractFungiblePostCondition = makeContractFungiblePostCondition(
  _contractAddress,
  exampleContractName,
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
      uintCV(loanID || 0),
      uintCV(amount)
    ],
    postConditions: [contractFungiblePostCondition],
    senderKey: senderKey,
    validateWithAbi: true,
    network,
    fee: 100000, //0.1STX
    anchorMode: 1,
  }
}

async function main(args: FunctionArgs) {
  const transaction = await makeContractCall(populateTxOptions(args.loanID));
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const borrow: ScriptFunction = {
  name: 'Borrow',
  action: main
}
