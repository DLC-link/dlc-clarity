import {
  SignedContractCallOptions,
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  cvToValue,
  ReadOnlyFunctionOptions,
} from '@stacks/transactions';
import { config } from './network-configs';
import { StacksNetwork } from '@stacks/network';

export const network = config.network;
export const senderKey = config.privateKey;
export const contractAddress = config.contractAddress;
export const exampleContractAddress = config.exampleContractAddress;
export const apiBase = config.api_base;
export const testCreatorKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801';
export const protocolPrivateKey = config.protocolPrivateKey;
export const tokenName = 'open-dlc';
export const attestorNFT = 'dlc-attestors';
export const registeredContractNFTName = `registered-contract`;
export const exampleContractName = 'sample-contract-loan-v1';
export const contractName = 'dlc-manager-v1';
export const contractFullName = `${contractAddress}.${contractName}`;

export const sendContractCall = async (txOptions: SignedContractCallOptions, network: StacksNetwork) => {
  const transaction = await makeContractCall(txOptions);
  console.log(transaction);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('broadcastResponse: ', broadcastResponse);
  return broadcastResponse;
};

export const callReadOnly = async (txOptions: ReadOnlyFunctionOptions) => {
  const transaction = await callReadOnlyFunction(txOptions);
  console.log('readOnly transaction:', transaction);
  console.log('readOnly cvToValue():', cvToValue(transaction));
  return { cv: transaction, cvToValue: cvToValue(transaction) };
};
