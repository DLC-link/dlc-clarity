import { cvToValue } from '@stacks/transactions';
import getRegisteredAttestor from './02_get-registered-attestor';
import { apiBase, attestorNFT, contractAddress, contractFullName } from './common';
import { NFTHoldingsData } from './models/models';
import { hexToBigInt } from 'micro-stacks/common';

export async function getAllAttestors() {
  const url = `${apiBase}/extended/v1/tokens/nft/holdings?asset_identifiers=${contractFullName}::${attestorNFT}&principal=${contractFullName}`;
  console.log('fetching from: ', url);
  const response = await fetch(url);
  const result: NFTHoldingsData = await response.json();
  return result;
}

export default async function fetchAllAttestors() {
  const result = await getAllAttestors();
  console.dir(result, { depth: 3 });
  await Promise.all(
    result.results.map(async (attestor) => {
      await getRegisteredAttestor(parseInt(attestor.value.repr.slice(1, attestor.value.repr.length)).toString());
    })
  );
}
