import {
  SignedContractCallOptions,
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  cvToValue,
  ReadOnlyFunctionOptions,
  ClarityValue,
  TxBroadcastResult,
  makeContractDeploy,
  ContractDeployOptions,
  TokenTransferOptions,
  makeSTXTokenTransfer,
  SignedTokenTransferOptions,
} from '@stacks/transactions';
import { config } from './network-configs.js';
import { StacksNetwork } from '@stacks/network';
import { hexToBytes as hexToBytesMS } from 'micro-stacks/common';
import { getDlcManagerDeployment, getSampleContractDeployment, readConfig } from './read-config.js';

let deployment = await config.configReader(config.deploymentFile, (process.env.FETCH_BRANCH as string) ?? 'dev');
let dlcManagerDeployment = getDlcManagerDeployment(deployment);
let sampleContractDeployment = getSampleContractDeployment(deployment);

export const network = config.network;
export const deployerPrivateKey = config.privateKey;
export const contractAddress = dlcManagerDeployment['expected-sender'];
export const exampleContractAddress = sampleContractDeployment['expected-sender'];
export const apiBase = config.api_base;
export const testCreatorKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801';
export const protocolPrivateKey = config.protocolPrivateKey;
export const openDLCNFT = 'open-dlc';
export const registeredContractNFTName = `registered-contract`;
export const exampleContractName = sampleContractDeployment['contract-name'];
export const contractName = dlcManagerDeployment['contract-name'];
export const contractFullName = `${contractAddress}.${contractName}`;

// Functions

export const sendContractCall = async (
  txOptions: SignedContractCallOptions,
  network: StacksNetwork
): Promise<TxBroadcastResult> => {
  const transaction = await makeContractCall(txOptions);
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('broadcastResponse: ', broadcastResponse);
  return broadcastResponse;
};

export const callReadOnly = async (
  txOptions: ReadOnlyFunctionOptions,
  dirDepth: number = 3
): Promise<{
  cv: ClarityValue;
  cvToValue: any;
}> => {
  const transaction = await callReadOnlyFunction(txOptions);
  console.log('[readOnly] transaction:');
  console.dir(transaction, { depth: dirDepth });
  console.log('[readOnly] cvToValue():');
  console.dir(cvToValue(transaction), { depth: dirDepth });
  return { cv: transaction, cvToValue: cvToValue(transaction) };
};

export const deployContract = async (
  txOptions: ContractDeployOptions,
  network: StacksNetwork
): Promise<TxBroadcastResult> => {
  const transaction = await makeContractDeploy(txOptions);
  console.log('transaction', transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('broadcastResponse: ', broadcastResponse);
  return broadcastResponse;
};

export const sendTokenTransfer = async (
  txOptions: SignedTokenTransferOptions,
  network: StacksNetwork
): Promise<TxBroadcastResult> => {
  const transaction = await makeSTXTokenTransfer(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('broadcastResponse: ', broadcastResponse);
  return broadcastResponse;
};

/**
 * Utility conversion function that can take both 0x prefixed
 * and unprefixed hex strings.
 * @param hex
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  return hexToBytesMS(hex.substring(0, 2) === '0x' ? hex.substring(2) : hex);
}
