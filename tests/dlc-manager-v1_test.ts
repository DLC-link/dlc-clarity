
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

Clarinet.test({
  name: "register Attestor function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    let checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-registered-attestor", [types.uint(0)], deployer.address),
    ]);
    checkStatus.receipts[0].result.expectErr();

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.1.1.1")], deployer.address),
    ]);

    block.receipts[0].result.expectOk();
    const mintEvent = block.receipts[0].events[0];
    assertEquals(typeof mintEvent, 'object');
    assertEquals(mintEvent.type, 'nft_mint_event');
    assertEquals(mintEvent.nft_mint_event.asset_identifier.split("::")[1], nftRegisterContract);
    assertEquals(mintEvent.nft_mint_event.recipient.split(".")[1], dlcManagerContract);

    checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-registered-attestor", [types.uint(0)], deployer.address),
    ]);

    checkStatus.receipts[0].result.expectOk();
    assertMatch(checkStatus.receipts[0].result, /1.1.1.1/);
  },
});

Clarinet.test({
  name: "deregister Attestor function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.1.1.1")], deployer.address),
    ]);

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-registered-attestor", [types.uint(0)], deployer.address),
    ]);

    block.receipts[0].result.expectOk();
    assertEquals(block.receipts[0].result, '(ok {dns: "1.1.1.1"})');

    let block2 = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "deregister-attestor", [types.uint(0)], deployer.address),
    ]);

    block2.receipts[0].result.expectOk().expectUint(0);

    let block3 = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-registered-attestor", [types.uint(0)], deployer.address),
    ]);

    block3.receipts[0].result.expectErr().expectUint(113);
  },
});

Clarinet.test({
  name: "Whitelist Contract function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;

    let checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "is-contract-whitelisted", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    checkStatus.receipts[0].result.expectOk();
    assertEquals(checkStatus.receipts[0].result, '(ok false)');

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);

    assertEquals(block.receipts[0].result, "(ok true)");

    checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "is-contract-whitelisted", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    checkStatus.receipts[0].result.expectOk().expectBool(true);
    // assertEquals(checkStatus.receipts[0].result, '(ok true)');
  },
});

Clarinet.test({
  name: "De-whitelist Contract function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;

    let checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "is-contract-whitelisted", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    checkStatus.receipts[0].result.expectOk().expectBool(false);

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "is-contract-whitelisted", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    checkStatus.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "de-whitelist-contract", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    checkStatus = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "is-contract-whitelisted", [types.principal(protocol_contract_deployer.address)], deployer.address),
    ]);
    checkStatus.receipts[0].result.expectOk().expectBool(false);
  },
});

//////////////////////////////
// Creating the dlcs
//////////////////////////////
Clarinet.test({
  name: "create-dlc fails if called from a non whitelisted contract, but works when whitelisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    let block = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    block.receipts[0].result.expectErr().expectUint(119);

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    block = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    block.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: "create-dlc called from a protocol-contract, emits a dlclink event, and mints an NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    let block = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    const event = block.receipts[0].events[0];

    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'contract_event');
    assertEquals(event.contract_event.topic, "print");
    assertStringIncludes(event.contract_event.value, "creator: " + 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6');
    assertStringIncludes(event.contract_event.value, "protocol-wallet: " + protocol_wallet.address);
    assertStringIncludes(event.contract_event.value, `event-source: "dlclink:create-dlc:v${eventSourceVersion}"`);
    // Expects the IPs of the attestors to be elements 0 and 2, as per the call in callback-contract-mock.clar
    assertStringIncludes(event.contract_event.value, `attestors: [{dns: "1.2.3.4"}, {dns: "9.10.11.12"}]`);

    const mintEvent = block.receipts[0].events[1];

    assertEquals(typeof mintEvent, 'object');
    assertEquals(mintEvent.type, 'nft_mint_event');
    assertEquals(mintEvent.nft_mint_event.asset_identifier.split("::")[1], nftAssetContract);
    assertEquals(mintEvent.nft_mint_event.recipient.split(".")[1], dlcManagerContract);
  },
});

Clarinet.test({
  name: "create-dlc creates a dlc in the map with the right status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    // Get the UUID back from the create request!
    const regex = new RegExp(/uuid: (0x[a-fA-F0-9]{64})/);
    const result = regex.exec(createDlcBlock.receipts[0].result);
    let uuid = result && result[1];

    let block = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-dlc-from-map", [uuid], deployer.address)
    ]);

    block.receipts[0].result.expectOk();
    assertMatch(block.receipts[0].result, /status: u0/);
  },
});

Clarinet.test({
  name: "create-dlc called from a protocol-contract returns a list of attestors and a uuid",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1')
    const deployer = accounts.get('deployer')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    assertEquals(whitelist_event.receipts[0].result, "(ok true)");

    let register_1 = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    let register_2 = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    let register_3 = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    assertEquals(register_1.receipts[0].result, "(ok u0)");
    assertEquals(register_2.receipts[0].result, "(ok u1)");
    assertEquals(register_3.receipts[0].result, "(ok u2)");

    let block = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    block.receipts[0].result.expectOk();
    assertMatch(block.receipts[0].result, /uuid: 0x[a-fA-F0-9]{64}/);
    // Expects the IPs of the attestors to be elements 0 and 2, as per the call in callback-contract-mock.clar
    assertStringIncludes(block.receipts[0].result, 'attestors: [{dns: "1.2.3.4"}, {dns: "9.10.11.12"}]');
  },
});

//////////////////////////////
// Set status funded
//////////////////////////////

// SetStatusFunded
// Update status to Funded
// Calls back to the protocol contract with the status update
// Fails if the tx sender and uuid of the associated DLC are not matching in the map
Clarinet.test({
  name: "set-status-funded updates the map with the right status",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    assertEquals(whitelist_event.receipts[0].result, "(ok true)");

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    // Get the UUID back from the create request!
    const regex = new RegExp(/uuid: (0x[a-fA-F0-9]{64})/);
    const result = regex.exec(createDlcBlock.receipts[0].result);
    let uuid = result && result[1];

    let setStatusFundedBlock = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "set-status-funded", [uuid], protocol_wallet.address)
    ]);

    let statusCheck = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "get-dlc-from-map", [uuid], deployer.address)
    ]);
    statusCheck.receipts[0].result.expectOk();
    assertMatch(statusCheck.receipts[0].result, /status: u1/);
  },
});

Clarinet.test({
  name: "set-status-funded fails if the tx sender and uuid of the associated DLC do not match",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    assertEquals(whitelist_event.receipts[0].result, "(ok true)");

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    // Get the UUID back from the create request!
    const regex = new RegExp(/uuid: (0x[a-fA-F0-9]{64})/);
    const result = regex.exec(createDlcBlock.receipts[0].result);
    let uuid = result && result[1];

    let setStatusFundedBlock = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "set-status-funded", [uuid], deployer.address)
    ]);
    setStatusFundedBlock.receipts[0].result.expectErr().expectUint(101);
  },
});

Clarinet.test({
  name: "set-status-funded should call back to the calling contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "whitelist-contract", [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))], deployer.address),
    ]);

    assertEquals(whitelist_event.receipts[0].result, "(ok true)");

    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("1.2.3.4")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("5.6.7.8")], deployer.address),
    ]);
    chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "register-attestor", [types.ascii("9.10.11.12")], deployer.address),
    ]);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(contractPrincipal(protocol_contract_deployer, callbackContract), "create-dlc-request-v1", [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)], protocol_contract_deployer.address)
    ]);

    // Get the UUID back from the create request!
    const regex = new RegExp(/uuid: (0x[a-fA-F0-9]{64})/);
    const result = regex.exec(createDlcBlock.receipts[0].result);
    let uuid = result && result[1];

    let setStatusFundedBlock = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, "set-status-funded", [uuid], protocol_wallet.address)
    ]);

    assertEquals("true", "false");
  },
});
