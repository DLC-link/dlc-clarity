import {
  network,
  deployerPrivateKey,
  contractAddress,
  contractName,
  sendContractCall,
  attestorNFT,
  callReadOnly,
} from './common';
import {
  NonFungibleConditionCode,
  SignedContractCallOptions,
  createAssetInfo,
  makeContractNonFungiblePostCondition,
  stringAsciiCV,
  uintCV,
} from '@stacks/transactions';

export default async function deregisterAttestorByDNS(attestor: string) {
  const { cv, cvToValue } = await callReadOnly({
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'get-registered-attestor-id',
    functionArgs: [stringAsciiCV(attestor)],
    senderAddress: contractAddress,
    network,
  });

  const contractNonFungiblePostCondition = makeContractNonFungiblePostCondition(
    contractAddress,
    contractName,
    NonFungibleConditionCode.Sends,
    createAssetInfo(contractAddress, contractName, attestorNFT),
    uintCV(cvToValue.value.id.value)
  );

  const txOptions: SignedContractCallOptions = {
    contractAddress: contractAddress,
    contractName: contractName,
    functionName: 'deregister-attestor-by-dns',
    functionArgs: [stringAsciiCV(attestor)],
    postConditions: [contractNonFungiblePostCondition],
    senderKey: deployerPrivateKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: 1,
  };

  await sendContractCall(txOptions, network);
}
