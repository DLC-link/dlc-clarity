import { network, deployerPrivateKey, contractAddress, contractName, sendContractCall } from './common';

import { stringAsciiCV } from '@stacks/transactions';

export default async function addAttestor(attestor: string) {
  const txOptions = {
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'register-attestor',
    functionArgs: [stringAsciiCV(attestor)],
    senderKey: deployerPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: 1,
  };

  await sendContractCall(txOptions, network);
}
