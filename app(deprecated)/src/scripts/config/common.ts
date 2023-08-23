import { config } from './network-configs';

export const network = config.network;
export const senderKey = config.privateKey;
export const contractAddress = config.contractAddress;
export const exampleContractAddress = config.exampleContractAddress;
export const apiBase = config.api_base;
export const testCreatorKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801';
export const protocolPrivateKey = config.protocolPrivateKey;
export const tokenName = 'open-dlc';

// Generally only changing these for the scripts:
export const exampleContractName = "sample-contract-loan-v0-1";
export const contractName = "dlc-manager-priced-v0-1";
export const assetName = 'BTC';
export const strikePrice = 1500;
// export const unixTimeStamp = 1658235003;
export const unixTimeStamp = Math.floor(new Date().getTime() / 1000) + 180;
export const UUID = "CuXuXO9M";
