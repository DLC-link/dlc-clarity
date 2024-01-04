import {
  network,
  protocolPrivateKey,
  sendContractCall,
  // exampleContractAddress,
  // exampleContractName,
  // contractName,
  contractAddress,
  hexToBytes,
} from './common.js';

import { bufferCV, contractPrincipalCV, getNonce } from '@stacks/transactions';

export default async function setStatusFunded(uuid: string, callbackContract: string) {
  const txOptions = {
    contractAddress: 'ST1JHQ5GPQT249ZWG6V4AWETQW5DYA5RHJB0JSMQ3',
    contractName: 'dlc-manager-v1',
    functionName: 'set-status-funded',
    functionArgs: [
      bufferCV(hexToBytes('0x3ca70cacedf7665a1335545d094f414b58e1ec63848d3b9ae600af62b3e759a0')),
      contractPrincipalCV('ST1R1061ZT6KPJXQ7PAXPFB6ZAZ6ZWW28G8HXK9G5', 'uasu-sbtc-loan-v1'),
    ],
    senderKey: protocolPrivateKey,
    validateWithAbi: true,
    network,
    anchorMode: 1,
    nonce: (await getNonce(contractAddress, network)) + 1n,
  };
  await sendContractCall(txOptions, network);
}
