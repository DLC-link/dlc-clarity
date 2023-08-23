import { broadcastTransaction, contractPrincipalCV, createAssetInfo, FungibleConditionCode, makeContractCall, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, SignedContractCallOptions, uintCV } from "@stacks/transactions";
import { exampleContractAddress, exampleContractName, protocolPrivateKey, network, contractAddress } from "../config/common";
import { FunctionArgs } from "../models/function-args.interface";
import { ScriptFunction } from "../models/script-function.interface";

const functionName = 'close-loan';

async function main(args: FunctionArgs) {
  function populateTxOptions(): SignedContractCallOptions {
    return {
      contractAddress: args.contractAddress || exampleContractAddress,
      contractName: args.contractName || exampleContractName,
      functionName: args.fname || functionName,
      functionArgs: [
        uintCV(args.loanID || 1),
      ],
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

export const closeLoan: ScriptFunction = {
  name: 'Close Loan',
  action: main
}


if (require.main === module) {
  const args = process.argv.slice(2);
  main({fname: args[0], contractAddress: args[1], contractName: args[2]})
}
