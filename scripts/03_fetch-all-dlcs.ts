import getDLC from './02_get-dlc.js';
import { apiBase, contractFullName, openDLCNFT } from './common.js';
import { NFTHoldingsData } from './models/models.js';

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
