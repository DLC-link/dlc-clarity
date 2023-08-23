import { broadcastTransaction, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network, contractAddress } from "../config/common";
import { FunctionArgs } from "../models/function-args.interface";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'repay';

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

async function main(args: FunctionArgs) {
  function populateTxOptions(): SignedContractCallOptions {
    return {
      contractAddress: exampleContractAddress,
      contractName: exampleContractName,
      functionName: functionName,
      functionArgs: [
        uintCV(args.loanID || 1),
        uintCV(120000) // amount in pennies
      ],
      postConditions: [contractFungiblePostCondition],
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

export const repay: ScriptFunction = {
  name: 'Repay',
  action: main
}
