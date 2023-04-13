// import path from 'path';
import dotenv from "dotenv";
dotenv.config();

console.log(process.env);

import { StacksMainnet, StacksMocknet, StacksTestnet } from "@stacks/network";

// const env = process.env.NODE_ENV as 'mocknet' | 'testnet' | 'mainnet';
// const env = 'mocknet_cloud';
const env = "mocknet_cloud";

const mocknet = {
  network: new StacksMocknet(),
  contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  exampleContractAddress: "STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6",
  privateKey:
    "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601",
  protocolPrivateKey:
    "de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801",
  mnemonic:
    "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw",
  api_base: "http://localhost:3999",
};

const mocknet_cloud = {
  network: new StacksMocknet({ url: "https://dev-oracle.dlc.link" }),
  contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  exampleContractAddress: "STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6",
  privateKey:
    "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601",
  protocolPrivateKey:
    "de433bdfa14ec43aa1098d5be594c8ffb20a31485ff9de2923b2689471c401b801",
  mnemonic:
    "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw",
  api_base: "https://dev-oracle.dlc.link",
};

const testnet = {
  network: new StacksTestnet(),
  contractAddress: "ST12S2DB1PKRM1BJ1G5BQS0AB0QPKHRVHWXDBJ27R",
  exampleContractAddress: "ST3ZD9W0SMPF8D4HB1M155CCAGE1PB0FH7YZZ82KR",
  privateKey: process.env.PRIVATE_KEY as string,
  protocolPrivateKey: process.env.PROTOCOL_PRIVATE_KEY as string,
  mnemonic: process.env.MNEMONIC as string,
  api_base: "https://stacks-node-api.testnet.stacks.co",
};

const mainnet = {
  network: new StacksMainnet(),
  contractAddress: "",
  exampleContractAddress: "",
  privateKey: process.env.PRIVATE_KEY as string,
  protocolPrivateKey: process.env.PROTOCOL_PRIVATE_KEY as string,
  mnemonic: process.env.MNEMONIC as string,
  api_base: "https://stacks-node-api.stacks.co",
};

const environments = {
  mocknet,
  mocknet_cloud,
  testnet,
  mainnet,
};

export const config = environments[env];
