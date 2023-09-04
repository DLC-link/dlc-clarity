import { readFileSync } from 'fs';
import { network, deployerPrivateKey, deployContract } from './common';

import { AnchorMode, ContractDeployOptions } from '@stacks/transactions';

export default async function deployProtocolContract(
  path: string,
  contractName: string,
  deployerKey: string = deployerPrivateKey
) {
  const txOptions: ContractDeployOptions = {
    contractName: contractName,
    codeBody: readFileSync(path).toString(),
    senderKey: deployerKey,
    network,
    anchorMode: AnchorMode.Any,
  };
  await deployContract(txOptions, network);
}
