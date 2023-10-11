import { network, deployerPrivateKey, contractAddress, contractName, sendContractCall } from './common';

import { contractPrincipalCV, getNonce, principalCV, uintCV } from '@stacks/transactions';

export default async function mintStablecoin(amount: number, recipient: string) {
  const txOptions = {
    contractAddress: contractAddress,
    contractName: 'dlc-stablecoin',
    functionName: 'mint',
    functionArgs: [uintCV(amount), principalCV(recipient)],
    senderKey: deployerPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: 1,
  };
  await sendContractCall(txOptions, network);
}
