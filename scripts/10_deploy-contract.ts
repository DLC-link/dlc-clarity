import { readFileSync } from 'fs';
import { network, deployerPrivateKey, deployContract } from './common';

import {
  AnchorMode,
  ContractDeployOptions,
  StacksTransaction,
  estimateContractDeploy,
  makeContractDeploy,
} from '@stacks/transactions';

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
    fee: 15000,
  };

  const tx = await makeContractDeploy(txOptions);
  const fee = await estimateContractDeploy(tx, network);

  console.log(fee);

  await deployContract(txOptions, network);
}
