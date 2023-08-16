import { uintCV } from '@stacks/transactions';
import { contractAddress, contractName, network, callReadOnly } from './common';

export default async function getRegisteredAttestor(id: string) {
  const txOptions = {
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'get-registered-attestor',
    functionArgs: [uintCV(id)],
    senderAddress: contractAddress,
    network,
  };
  await callReadOnly(txOptions);
}
