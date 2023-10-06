import {
  network,
  protocolPrivateKey,
  sendContractCall,
  exampleContractAddress,
  exampleContractName,
  deployerPrivateKey,
} from './common';

import { SignedContractCallOptions, StandardPrincipal, getNonce, principalCV, uintCV } from '@stacks/transactions';

export default async function setProtocolWallet(address: string) {
  const txOptions: SignedContractCallOptions = {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: 'set-protocol-wallet-address',
    functionArgs: [principalCV(address)],
    senderKey: protocolPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: 1,
    nonce: (await getNonce(exampleContractAddress, network)) + 1n,
  };
  await sendContractCall(txOptions, network);
}
