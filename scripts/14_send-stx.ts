import { network, protocolPrivateKey, sendTokenTransfer } from './common';

import { SignedTokenTransferOptions } from '@stacks/transactions';

export default async function sendSTXTo(address: string, amount: number) {
  const txOptions: SignedTokenTransferOptions = {
    recipient: address,
    amount: amount,
    senderKey: 'f9d7206a47f14d2870c163ebab4bf3e70d18f5d14ce1031f3902fbbc894fe4c701',
    network,
    fee: 100000,
    anchorMode: 1,
  };
  await sendTokenTransfer(txOptions, network);
}
