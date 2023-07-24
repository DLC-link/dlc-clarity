
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.5.4/index.ts';
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

// @ts-ignore
import { assertMatch, shiftPriceValue } from "./deps.ts";


// const BTChex = "BTC";
const UUID = "fakeuuid";
const nftAssetContract = "open-dlc";
const nftRegisterContract = "dlc-attestors"
const dlcManagerContract = "dlc-manager-v1";
const callbackContract = "callback-contract";
const eventSourceVersion = '1';

const contractPrincipal = (deployer: Account, contract: string) => `${deployer.address}.${contract}`;

// Test the "setAttestors" function
Clarinet.test({
  name: "register Attestor function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;


    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.buff("1.1.1.1")], deployer.address),
    ]);

    block.receipts[0].result.expectOk();
    const mintEvent = block.receipts[0].events[0];
    assertEquals(typeof mintEvent, 'object');
    assertEquals(mintEvent.type, 'nft_mint_event');
    assertEquals(mintEvent.nft_mint_event.asset_identifier.split("::")[1], nftRegisterContract);
    assertEquals(mintEvent.nft_mint_event.recipient.split(".")[1], dlcManagerContract);

  },
});

// CreateDLC
// Have a list of registered contracts
// Have a list of whitelisted protocol wallets

// (protocolWallet address, numAttestors int)
// create the map
// create the NFT
// done - emit the event in the created state
// UUID should be randomly generated

// Fails if not called from a registered contract
// Fails if the wallet is not also whitelisted

Clarinet.test({
  name: "create-dlc called from a protocol-contract emits a dlclink event, and mints an NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1')

    let block = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], creator.address)
    ]);

    const event = block.receipts[0].events[0];

    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'contract_event');
    assertEquals(event.contract_event.topic, "print");
    assertStringIncludes(event.contract_event.value, "creator: " + 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5');
    assertStringIncludes(event.contract_event.value, "protocol-wallet: " + 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP');
    assertStringIncludes(event.contract_event.value, `event-source: "dlclink:create-dlc:v${eventSourceVersion}"`);

    const mintEvent = block.receipts[0].events[1];

    assertEquals(typeof mintEvent, 'object');
    assertEquals(mintEvent.type, 'nft_mint_event');
    assertEquals(mintEvent.nft_mint_event.asset_identifier.split("::")[1], nftAssetContract);
    assertEquals(mintEvent.nft_mint_event.recipient.split(".")[1], dlcManagerContract);
  },
});

Clarinet.test({
  name: "create-dlc called from a protocol-contract returns a list of attestors and a uuid",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1')
    const deployer = accounts.get('deployer')!;

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.buff("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.buff("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.buff("9.10.11.12")], deployer.address),
    ]);


    let block = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], creator.address)
    ]);

    block.receipts[0].result.expectOk();
    assertMatch(block.receipts[0].result, /uuid: 0x[a-fA-F0-9]{64}/);
    assertMatch(block.receipts[0].result, /attestors: \["\d.\d.\d.\d", "\d.\d.\d.\d"\]/);
  },
});

// SetStatusFunded
// Update status to Funded
// Calls back to the protocol contract with the status update

// Fails if the tx sender and uuid of the associated DLC are not matching in the map
