// import getDLC from './02_get-dlc.js';
import { bufferCV, callReadOnlyFunction, cvToValue } from '@stacks/transactions';
import { apiBase, callReadOnly, hexToBytes, network, openDLCNFT } from '../common.js';
import { NFTHoldingsData } from '../models/models.js';

const contractFullName = 'ST1JHQ5GPQT249ZWG6V4AWETQW5DYA5RHJB0JSMQ3.dlc-manager-v1';
let counter = 0;
let fundedCounter = 0;
let closingCounter = 0;

export async function getDLC(uuid: string) {
  const txOptions = {
    contractAddress: 'ST1JHQ5GPQT249ZWG6V4AWETQW5DYA5RHJB0JSMQ3',
    contractName: 'dlc-manager-v1',
    functionName: 'get-dlc',
    functionArgs: [bufferCV(hexToBytes(uuid))],
    senderAddress: 'ST1JHQ5GPQT249ZWG6V4AWETQW5DYA5RHJB0JSMQ3',
    network,
  };
  const transaction = await callReadOnlyFunction(txOptions);
  const dlc = cvToValue(transaction);
  if (
    dlc.value['callback-contract'].value == 'ST1R1061ZT6KPJXQ7PAXPFB6ZAZ6ZWW28G8HXK9G5.uasu-sbtc-loan-v1' &&
    dlc.value['status'].value != '0'
  ) {
    console.dir(dlc.value, { depth: 3 });
    counter++;
    if (dlc.value['status'].value == '1') {
      fundedCounter++;
    }
    if (dlc.value['status'].value == '2') {
      closingCounter++;
    }
  }
}

export async function getAllDLCs() {
  const url = `${apiBase}/extended/v1/tokens/nft/holdings?asset_identifiers=${contractFullName}::${openDLCNFT}&principal=${contractFullName}&limit=200`;
  console.log('fetching from: ', url);
  const response = await fetch(url);
  const result: NFTHoldingsData = await response.json();
  return result;
}

export default async function fetchAllDLCs() {
  const result = await getAllDLCs();
  // console.dir(result, { depth: 3 });
  await Promise.all(
    result.results.map(async (dlc) => {
      try {
        await getDLC(dlc.value.repr);
      } catch (error) {
        console.log(dlc.value.repr);
        console.error(error);
      }
    })
  );
  console.log('total relevant: ', counter);
  console.log('total funded: ', fundedCounter);
  console.log('total closing: ', closingCounter);
}

await fetchAllDLCs();
