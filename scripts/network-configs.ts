import { StacksMainnet, StacksMocknet, StacksTestnet } from '@stacks/network';
import { readConfig, readRemoteConfig, getDlcManagerDeployment, getSampleContractDeployment } from './read-config.js';
import dotenv from 'dotenv';
dotenv.config();

const env = process.env.NETWORK as 'mocknet' | 'mocknet_cloud' | 'testnet' | 'mainnet';

const mocknet = {
  network: new StacksMocknet(),
  configReader: readConfig,
  deploymentFile: 'custom.devnet-plan.yaml',
  privateKey: '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601',
  protocolPrivateKey: 'de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801',
  mnemonic:
    'twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw',
  api_base: 'http://localhost:3999',
};

const mocknet_cloud = {
  network: new StacksMocknet({ url: process.env.MOCKNET_ADDRESS as string }),
  configReader: readRemoteConfig,
  deploymentFile: 'custom.devnet-plan.yaml',
  privateKey: '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601',
  protocolPrivateKey: 'de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801',
  mnemonic:
    'twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw',
  api_base: process.env.MOCKNET_ADDRESS as string,
};

const testnet = {
  network: new StacksTestnet(),
  configReader: readConfig,
  deploymentFile: 'custom.testnet-plan.yaml',
  privateKey: process.env.PRIVATE_KEY as string,
  protocolPrivateKey: process.env.PROTOCOL_PRIVATE_KEY as string,
  mnemonic: process.env.MNEMONIC as string,
  api_base: 'https://api.testnet.hiro.so',
};

const mainnet = {
  network: new StacksMainnet(),
  configReader: readRemoteConfig,
  deploymentFile: 'custom.mainnet-plan.yaml',
  privateKey: process.env.PRIVATE_KEY as string,
  protocolPrivateKey: process.env.PROTOCOL_PRIVATE_KEY as string,
  mnemonic: process.env.MNEMONIC as string,
  api_base: 'https://api.hiro.so',
};

const environments = {
  mocknet,
  mocknet_cloud,
  testnet,
  mainnet,
};

export const config = environments[env];
