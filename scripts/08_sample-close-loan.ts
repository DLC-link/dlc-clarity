import {
  AnchorMode,
  NonFungibleConditionCode,
  SignedContractCallOptions,
  bufferCV,
  createAssetInfo,
  cvToValue,
  makeContractNonFungiblePostCondition,
  uintCV,
} from '@stacks/transactions';
import {
  network,
  exampleContractAddress,
  exampleContractName,
  sendContractCall,
  testCreatorKey,
  contractAddress,
  contractName,
  openDLCNFT,
  callReadOnly,
  hexToBytes,
} from './common';

export default async function closeLoan(id: number) {
  const getLoanOptions = {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: 'get-loan',
    functionArgs: [uintCV(id)],
    senderAddress: exampleContractAddress,
    network,
  };
  const { cvToValue } = await callReadOnly(getLoanOptions);
  const uuid = cvToValue.value.dlc_uuid.value.value;

  const contractNonFungiblePostCondition = makeContractNonFungiblePostCondition(
    contractAddress,
    contractName,
    NonFungibleConditionCode.Sends,
    createAssetInfo(contractAddress, contractName, openDLCNFT),
    bufferCV(hexToBytes(uuid))
  );

  const txOptions: SignedContractCallOptions = {
    contractAddress: exampleContractAddress,
    contractName: exampleContractName,
    functionName: 'close-loan',
    functionArgs: [uintCV(id)],
    postConditions: [contractNonFungiblePostCondition],
    senderKey: testCreatorKey,
    validateWithAbi: true,
    network,
    fee: 100000,
    anchorMode: AnchorMode.OnChainOnly,
  };
  await sendContractCall(txOptions, network);
}
