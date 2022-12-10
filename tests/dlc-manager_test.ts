// deno-lint-ignore-file require-await no-explicit-any prefer-const
// @ts-ignore
import { Clarinet, Tx, Chain, Account, types, assertEquals, pricePackageToCV, assertStringIncludes, hex2ascii, shiftPriceValue } from "./deps.ts";
// @ts-ignore
import type { PricePackage, Block } from "./deps.ts";

// Unfortunately it is not straightforward to import "../src/stacks-redstone.ts"
// in Clarinet test files. Values are therefore generated by the helper scripts
// found in the ./scripts directory. The parameters used to generate the data
// is provided in comments.

const BTChex = "BTC";
const UUID = "fakeuuid";
const nftAssetContract = "open-dlc";
const dlcManagerContract = "dlc-manager-priced-v0-1";
const callbackContract = "callback-contract";

const contractPrincipal = (deployer: Account, contract: string) => `${deployer.address}.${contract}`;

const trustedOraclePubkey = "0x035ca791fed34bf9e9d54c0ce4b9626e1382cf13daa46aa58b657389c24a751cc6";
const untrustedOraclePubkey = "0x03cd2cfdbd2ad9332828a7a13ef62cb999e063421c708e863a7ffed71fb61c88c9";

const pricePackage: PricePackage = {
  timestamp: 1647332581,
  prices: [{ symbol: "BTC", value: 23501.669932 }]
}

const pricePackageForLiquidation: PricePackage = {
  timestamp: 1647332581,
  prices: [{ symbol: "BTC", value: 13588.669932 }]
}

const packageCV = pricePackageToCV(pricePackage);
const packageCVForLiquidation = pricePackageToCV(pricePackageForLiquidation);

const signature = "0x4ee83f2bdc6d67619e13c5786c42aa66a899cc63229310400247bac0dd22e99454cec834a98b56a5042bcec5e709a76e90d072569e5db855e58e4381d0adb0c201";

const signatureForLiquidation = "0x3256910f5d0788ee308baecd3787a36ab2e3a8ff3fb4d0fc4638c84ba48957b82876b71eb58751366dd7a8a6ae1f2040120706742676ddc2187170932bb344e901";

function setTrustedOracle(chain: Chain, senderAddress: string): Block {
  return chain.mineBlock([
    Tx.contractCall(dlcManagerContract, "set-trusted-oracle", [trustedOraclePubkey, types.bool(true)], senderAddress),
  ]);
}

Clarinet.test({
  name: "create-dlc called multiple times in the same block generates correct UUIDs",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer_2 = accounts.get('deployer_2')!;

    const localNonces = [0, 1, 2, 3]

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "create-dlc", [types.uint(10), types.principal(contractPrincipal(deployer_2, callbackContract)), types.uint(localNonces[0])], deployer_2.address),
      Tx.contractCall(dlcManagerContract, "create-dlc", [types.uint(10), types.principal(contractPrincipal(deployer_2, callbackContract)), types.uint(localNonces[1])], deployer_2.address),
      Tx.contractCall(dlcManagerContract, "create-dlc", [types.uint(10), types.principal(contractPrincipal(deployer_2, callbackContract)), types.uint(localNonces[2])], deployer_2.address),
      Tx.contractCall(dlcManagerContract, "create-dlc", [types.uint(10), types.principal(contractPrincipal(deployer_2, callbackContract)), types.uint(localNonces[3])], deployer_2.address)
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    let counter = 0;
    block.receipts.forEach(receipt => {
      receipt.events.forEach(event => {
        assertEquals(typeof event, 'object');
        assertEquals(event.type, 'contract_event');
        assertEquals(event.contract_event.topic, "print");
        assertStringIncludes(event.contract_event.value, 'event-source: "dlclink:create-dlc:v0-1"')
        assertStringIncludes(event.contract_event.value,`0x000000000000000000000000000000000000000000000000000000000000000${localNonces[counter]}`) 
      })
      counter++;
    })
  },
});