import {
  network,
  protocolPrivateKey,
  sendContractCall,
  exampleContractAddress,
  exampleContractName,
  deployerPrivateKey,
} from './common';

import { uintCV } from '@stacks/transactions';

export default async function setLiquidationFee(fee: number) {
  const txOptions = {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: 'set-liquidation-fee',
    functionArgs: [uintCV(fee)],
    senderKey: 'b463f0df6c05d2f156393eee73f8016c5372caa0e9e29a901bb7171d90dc4f1401',
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: 1,
  };
  await sendContractCall(txOptions, network);
}
