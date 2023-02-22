import { broadcastTransaction, bufferCV, bufferCVFromString, contractPrincipalCV, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, PostConditionMode, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network, contractAddress, senderKey } from "../config/common";
import { FunctionArgs } from "../models/function-args.interface";
import { ScriptFunction } from "../models/script-function.interface";
import redstone from 'redstone-api-extended';
import { liteSignatureToStacksSignature } from "./helper-functions";


async function main(args: FunctionArgs) {

  const functionName = args.fname || 'borrow';
  const amount = args.amount || 13000000000;

  const _contractAddress = args.contractAddress || exampleContractAddress;
  const _contractName = args.contractName || exampleContractName;
  const _postConditionCode = FungibleConditionCode.GreaterEqual;
  const _assetAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const _assetContractName = 'dlc-stablecoin';
  const _assetName = 'dlc-stablecoin';
  const _fungibleAssetInfo = createAssetInfo(_assetAddress, _assetContractName, _assetName);

  const asset = "BTC";

  const dataPackage = await redstone.oracle.getFromDataFeed("redstone", asset);
  console.log("Redstone price package:", dataPackage);

  const liteEvmSignature = dataPackage.liteSignature;
  const symbol = asset;
  const price = dataPackage.priceData.values[0];
  const timestamp = dataPackage.priceData.timestamp;

  const liteSig = liteSignatureToStacksSignature(liteEvmSignature);
  const sig = Buffer.from(liteSig);
  const symbolcv = bufferCVFromString(symbol);
  const value = uintCV(price);

  // const contractFungiblePostCondition = makeContractFungiblePostCondition(
  //   _contractAddress,
  //   _contractName,
  //   _postConditionCode,
  //   amount,
  //   _fungibleAssetInfo
  // );

  function populateTxOptions(): SignedContractCallOptions {
    return {
      contractAddress: _contractAddress,
      contractName: _contractName,
      functionName: functionName,
      functionArgs: [
        uintCV(args.loanID || 1),
        uintCV(amount),
        contractPrincipalCV(args.contractAddress || exampleContractAddress, "usda-pool-v1-1"),
        uintCV(timestamp),
        value,
        bufferCV(sig)
      ],
      // postConditions: [contractFungiblePostCondition],
      postConditionMode: PostConditionMode.Allow,
      senderKey: senderKey,
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

export const borrow: ScriptFunction = {
  name: 'Borrow',
  action: main
}

if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(args)
  main({fname: args[0], contractAddress: args[1], contractName: args[2], loanID: parseInt(args[3]), amount: parseInt(args[4])})
}
