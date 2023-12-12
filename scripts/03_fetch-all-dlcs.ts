import getDLC from './02_get-dlc';
import { apiBase, contractFullName, openDLCNFT } from './common';
import { NFTHoldingsData } from './models/models';

export async function getAllDLCs() {
  const url = `${apiBase}/extended/v1/tokens/nft/holdings?asset_identifiers=${contractFullName}::${openDLCNFT}&principal=${contractFullName}`;
  console.log('fetching from: ', url);
  const response = await fetch(url);
  const result: NFTHoldingsData = await response.json();
  return result;
}

export default async function fetchAllDLCs() {
  const result = await getAllDLCs();
  console.dir(result, { depth: 3 });
  await Promise.all(
    result.results.map(async (dlc) => {
      await getDLC(parseInt(dlc.value.repr.slice(1, dlc.value.repr.length)).toString());
    })
  );
}
