import { bufferCV } from '@stacks/transactions';
import { network, callReadOnly, hexToBytes, contractAddress, contractName } from './common.js';

export default async function getDLC(uuid: string) {
  const txOptions = {
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'get-dlc',
    functionArgs: [bufferCV(hexToBytes(uuid))],
    senderAddress: contractAddress,
    network,
  };
  await callReadOnly(txOptions, 6);
}
