import { StacksMainnet, StacksMocknet, StacksTestnet } from '@stacks/network';
import dotenv from 'dotenv';
dotenv.config();

const env = process.env.NETWORK as 'mocknet' | 'mocknet_cloud' | 'testnet' | 'mainnet';

const mocknet = {
  network: new StacksMocknet(),
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  exampleContractAddress: 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6',
  privateKey: '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601',
  protocolPrivateKey: 'de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801',
  mnemonic:
    'twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw',
  api_base: 'http://localhost:3999',
};

const mocknet_cloud = {
  network: new StacksMocknet({ url: process.env.MOCKNET_ADDRESS as string }),
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  exampleContractAddress: 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6',
  privateKey: '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601',
  protocolPrivateKey: 'de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801',
  mnemonic:
    'twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw',
  api_base: process.env.MOCKNET_ADDRESS as string,
};

const testnet = {
  network: new StacksTestnet(),
  contractAddress: 'ST1JHQ5GPQT249ZWG6V4AWETQW5DYA5RHJB0JSMQ3',
  exampleContractAddress: 'ST1JHQ5GPQT249ZWG6V4AWETQW5DYA5RHJB0JSMQ3',
  privateKey: process.env.PRIVATE_KEY as string,
  protocolPrivateKey: process.env.PROTOCOL_PRIVATE_KEY as string,
  mnemonic: process.env.MNEMONIC as string,
  api_base: 'https://api.testnet.hiro.so',
};

const mainnet = {
  network: new StacksMainnet(),
  contractAddress: '',
  exampleContractAddress: '',
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
