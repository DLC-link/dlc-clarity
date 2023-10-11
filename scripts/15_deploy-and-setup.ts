import { readFileSync } from 'fs';
import { network, deployerPrivateKey, deployContract, exampleContractAddress } from './common';
import deployProtocolContract from './10_deploy-contract';
import mintStablecoin from './09_mint-stablecoin';
import registerContract from './05_register-contract';

export default async function deployAndSetupProtocolContract(
  path: string,
  contractName: string,
  deployerKey: string = deployerPrivateKey
) {
  // NOTE: this does not work well, as they don't await the confirmations....
  console.log(`deploying protocol contract to ${network} and ${contractName}...`);
  await deployProtocolContract(path, contractName, deployerKey);
  console.log(`minting stablecoin to ${exampleContractAddress}.${contractName} ...`);
  await mintStablecoin(1000000000000, `${exampleContractAddress}.${contractName}`);
  console.log(`registering contract ${exampleContractAddress}.${contractName}...`);
  await registerContract(exampleContractAddress, contractName);
}
