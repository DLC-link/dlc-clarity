import {
  network,
  protocolPrivateKey,
  sendContractCall,
  exampleContractAddress,
  exampleContractName,
  contractName,
  contractAddress,
  hexToBytes,
} from './common';

import { bufferCV, contractPrincipalCV, getNonce } from '@stacks/transactions';

export default async function setStatusFunded(uuid: string, callbackContract: string) {
  const txOptions = {
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'set-status-funded',
    functionArgs: [bufferCV(hexToBytes(uuid)), contractPrincipalCV(exampleContractAddress, exampleContractName)],
    senderKey: protocolPrivateKey,
    validateWithAbi: true,
    network,
    fee: 500000,
    anchorMode: 1,
    nonce: (await getNonce(contractAddress, network)) + 1n,
  };
  await sendContractCall(txOptions, network);
}
