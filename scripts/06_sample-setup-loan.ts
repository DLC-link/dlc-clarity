import { AnchorMode, SignedContractCallOptions, bufferCV, uintCV } from '@stacks/transactions';
import { network, exampleContractAddress, exampleContractName, sendContractCall, testCreatorKey } from './common.js';

export default async function setupLoan(btcDeposit: number) {
  const txOptions: SignedContractCallOptions = {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: 'setup-loan',
    functionArgs: [uintCV(btcDeposit)],
    senderKey: testCreatorKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: AnchorMode.OnChainOnly,
  };
  await sendContractCall(txOptions, network);
}
