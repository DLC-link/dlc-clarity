import { uintCV } from '@stacks/transactions';
import { network, callReadOnly, exampleContractAddress, exampleContractName } from './common';

export default async function getLoan(id: string) {
  const txOptions = {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: 'get-loan',
    functionArgs: [uintCV(id)],
    senderAddress: exampleContractAddress,
    network,
  };
  await callReadOnly(txOptions, 6);
}
