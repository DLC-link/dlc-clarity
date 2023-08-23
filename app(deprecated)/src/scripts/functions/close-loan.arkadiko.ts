import { AnchorMode, broadcastTransaction, contractPrincipalCV, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network, contractAddress, senderKey } from "../config/common";
import { FunctionArgs } from "../models/function-args.interface";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'close-loan';

async function main(args: FunctionArgs) {
  console.log(args);
  function populateTxOptions(): SignedContractCallOptions {
    return {
      contractAddress: args.contractAddress || exampleContractAddress,
      contractName: args.contractName || exampleContractName,
      functionName: args.fname || functionName,
      functionArgs: [
        uintCV(args.loanID || 0),
        contractPrincipalCV(args.contractAddress || exampleContractAddress, "usda-pool-v1-1"),
      ],
      senderKey: senderKey,
      validateWithAbi: true,
      network,
      fee: 100000, //0.1STX
      anchorMode: AnchorMode.Any,
    }
  }
  const transaction = await makeContractCall(populateTxOptions());
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log("broadcastResponse: ", broadcastResponse);
}

export const closeLoan: ScriptFunction = {
  name: 'Close Loan',
  action: main
}


if (require.main === module) {
  const args = process.argv.slice(2);
  main({fname: args[0], contractAddress: args[1], contractName: args[2], loanID: parseInt(args[3])})
}
