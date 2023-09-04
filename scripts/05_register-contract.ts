import { network, deployerPrivateKey, contractAddress, contractName, sendContractCall } from './common';

import { contractPrincipalCV } from '@stacks/transactions';

export default async function registerContract(protocolAddress: string, protocolName: string) {
  const txOptions = {
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'register-contract',
    functionArgs: [contractPrincipalCV(protocolAddress, protocolName)],
    senderKey: deployerPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: 1,
  };
  await sendContractCall(txOptions, network);
}
