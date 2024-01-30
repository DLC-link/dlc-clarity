//@ts-ignore-next-line
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.1/index.ts';

//@ts-ignore-next-line
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.196.0/testing/asserts.ts';

// @ts-ignore-next-line
import { assertMatch, shiftPriceValue } from './deps.ts';

// const BTChex = "BTC";
const UUID = 'fakeuuid';
const nftAssetContract = 'open-dlc';
const dlcManagerContract = 'dlc-manager-v1-1';
const callbackContract = 'callback-contract-v1-1';
const eventSourceVersion = '1';
const mockFundingTxId = 'F4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';

const contractPrincipal = (deployer: Account, contract: string) => `${deployer.address}.${contract}`;

//////////////////////////////
// helpers
//////////////////////////////

function getUUIDFromResponse(createDlcBlock: any) {
  const regex = new RegExp(/ok (0x[a-fA-F0-9]{64})/);
  const result = regex.exec(createDlcBlock.receipts[0].result);
  let uuid = result && result[1];
  return uuid;
}

//////////////////////////////
// Creating the dlcs
//////////////////////////////
Clarinet.test({
  name: 'create-dlc fails if called from a non whitelisted contract, but works when whitelisted',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;

    // registerAttestors(chain, deployer);

    let block = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(119);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    block = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    block.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: 'create-dlc called from a protocol-contract, emits a dlclink event, and mints an NFT',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let block = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    const event = block.receipts[0].events[0];

    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'contract_event');
    assertEquals(event.contract_event.topic, 'print');
    assertStringIncludes(event.contract_event.value, 'creator: ' + 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6');
    assertStringIncludes(event.contract_event.value, 'protocol-wallet: ' + protocol_wallet.address);
    assertStringIncludes(event.contract_event.value, `event-source: "dlclink:create-dlc:v${eventSourceVersion}"`);

    const mintEvent = block.receipts[0].events[1];

    assertEquals(typeof mintEvent, 'object');
    assertEquals(mintEvent.type, 'nft_mint_event');
    assertEquals(mintEvent.nft_mint_event.asset_identifier.split('::')[1], nftAssetContract);
    assertEquals(mintEvent.nft_mint_event.recipient.split('.')[1], dlcManagerContract);
  },
});

Clarinet.test({
  name: 'create-dlc creates a dlc in the map with the right status',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    let block = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);

    block.receipts[0].result.expectSome();
    assertMatch(block.receipts[0].result, /status: u0/);
  },
});

Clarinet.test({
  name: 'create-dlc called from a protocol-contract returns a uuid',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let block = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    block.receipts[0].result.expectOk();
    assertMatch(block.receipts[0].result, /ok 0x[a-fA-F0-9]{64}/);
  },
});

//////////////////////////////
// Set status funded
//////////////////////////////

Clarinet.test({
  name: 'set-status-funded updates the map with the right status',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    let ssfBlock = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    console.log(ssfBlock);

    let statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();
    assertMatch(statusCheck.receipts[0].result, /status: u1/);
  },
});

Clarinet.test({
  name: 'set-status-funded fails if the tx sender and uuid of the associated DLC do not match',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    let setStatusFundedBlock = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        deployer.address
      ),
    ]);
    setStatusFundedBlock.receipts[0].result.expectErr().expectUint(101);
  },
});

Clarinet.test({
  name: 'set-status-funded fails if the dlc is not in the right state',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();
    assertMatch(statusCheck.receipts[0].result, /status: u1/);

    let setStatus = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);
    setStatus.receipts[0].result.expectErr().expectUint(120);
  },
});

Clarinet.test({
  name: 'set-status-funded should call back to the calling contract',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    let setStatusFundedBlock = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    setStatusFundedBlock.receipts[0].result.expectOk().expectBool(true);
    const event = setStatusFundedBlock.receipts[0].events[1];

    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'contract_event');
    assertEquals(event.contract_event.topic, 'print');
    assertStringIncludes(event.contract_event.value, `event-source: "callback-set-status-funded", uuid: ${uuid}`);
  },
});

//////////////////////////////
// Close DLC
//////////////////////////////

Clarinet.test({
  name: "closeDLC reverts if called from a contract that isn't the DLC owner/creator",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;
    const some_wallet = accounts.get('wallet_3')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let closeCall = chain.mineBlock([
      Tx.contractCall(dlcManagerContract, 'close-dlc', [uuid, types.uint(5)], some_wallet.address),
    ]);

    closeCall.receipts[0].result.expectErr().expectUint(101);
  },
});

Clarinet.test({
  name: 'closeDLC reverts if called when in the wrong state',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectOk();

    closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectErr().expectUint(120);
  },
});

Clarinet.test({
  name: 'closeDLC emits a CloseDLC event with the correct data and burn the NFT',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectOk();

    const event = closeCall.receipts[0].events[0];

    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'contract_event');
    assertEquals(event.contract_event.topic, 'print');
    assertStringIncludes(event.contract_event.value, 'creator: ' + 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6'); // assertStringIncludes(event.contract_event.value, "protocol-wallet: " + protocol_wallet.address);
    assertStringIncludes(event.contract_event.value, `event-source: "dlclink:close-dlc:v${eventSourceVersion}"`);

    const burnEvent = closeCall.receipts[0].events[1];

    assertEquals(typeof burnEvent, 'object');
    assertEquals(burnEvent.type, 'nft_burn_event');
    assertEquals(burnEvent.nft_burn_event.asset_identifier.split('::')[1], nftAssetContract);
    assertEquals(burnEvent.nft_burn_event.sender.split('.')[1], dlcManagerContract);
  },
});

//////////////////////////////
// Post-close
//////////////////////////////

Clarinet.test({
  name: 'post-close updates the map with the right status',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();

    let closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectOk();

    const btcTxId = 'F4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
    let postClose = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'post-close',
        [uuid, types.ascii(btcTxId), types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        protocol_wallet.address
      ),
    ]);
    postClose.receipts[0].result.expectOk();

    statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();
    assertMatch(statusCheck.receipts[0].result, /status: u3/);
  },
});

Clarinet.test({
  name: 'post-close fails if the tx sender and uuid of the associated DLC do not match',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();

    let closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectOk();

    const btcTxId = 'F4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
    let postClose = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'post-close',
        [uuid, types.ascii(btcTxId), types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);
    postClose.receipts[0].result.expectErr().expectUint(101);
  },
});

Clarinet.test({
  name: 'post-close fails if the dlc is not in the right state',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();

    let closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectOk();

    const btcTxId = 'F4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
    let postClose = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'post-close',
        [uuid, types.ascii(btcTxId), types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        protocol_wallet.address
      ),
    ]);
    postClose.receipts[0].result.expectOk();

    postClose = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'post-close',
        [uuid, types.ascii(btcTxId), types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        protocol_wallet.address
      ),
    ]);
    postClose.receipts[0].result.expectErr().expectUint(120);
  },
});

Clarinet.test({
  name: 'post-close should call back to the calling contract',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const protocol_contract_deployer = accounts.get('protocol_contract_deployer')!;
    const creator = accounts.get('wallet_1');
    const deployer = accounts.get('deployer')!;
    const protocol_wallet = accounts.get('protocol_wallet')!;

    let whitelist_event = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        deployer.address
      ),
    ]);

    whitelist_event.receipts[0].result.expectOk().expectBool(true);

    let createDlcBlock = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'create-dlc-request',
        [types.uint(1000000), types.uint(shiftPriceValue(1)), types.uint(14000), types.uint(1000), types.uint(10)],
        protocol_contract_deployer.address
      ),
    ]);

    let uuid = getUUIDFromResponse(createDlcBlock);

    chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'set-status-funded',
        [
          uuid,
          types.ascii(mockFundingTxId),
          types.principal(contractPrincipal(protocol_contract_deployer, callbackContract)),
        ],
        protocol_wallet.address
      ),
    ]);

    let statusCheck = chain.mineBlock([Tx.contractCall(dlcManagerContract, 'get-dlc', [uuid], deployer.address)]);
    statusCheck.receipts[0].result.expectSome();

    let closeCall = chain.mineBlock([
      Tx.contractCall(
        contractPrincipal(protocol_contract_deployer, callbackContract),
        'close-dlc-request',
        [uuid, types.uint(5)],
        protocol_contract_deployer.address
      ),
    ]);
    closeCall.receipts[0].result.expectOk();

    const btcTxId = 'F4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
    let postClose = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'post-close',
        [uuid, types.ascii(btcTxId), types.principal(contractPrincipal(protocol_contract_deployer, callbackContract))],
        protocol_wallet.address
      ),
    ]);
    postClose.receipts[0].result.expectOk();

    const event = postClose.receipts[0].events[1];

    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'contract_event');
    assertEquals(event.contract_event.topic, 'print');
    assertStringIncludes(event.contract_event.value, `event-source: "callback-mock-post-close", uuid: ${uuid}`);
    assertStringIncludes(event.contract_event.value, `btc-tx-id: "${btcTxId}"`);
  },
});

////////////////// Contract Registration

Clarinet.test({
  name: 'only contract-owner can register contracts',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('protocol_contract_deployer')!;

    let block = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(deployer_2, callbackContract))],
        deployer_2.address
      ),
    ]);

    const err = block.receipts[0].result.expectErr();
    assertEquals(err, 'u101'); // err-unauthorised
  },
});

Clarinet.test({
  name: 'is-contract-registered returns true for registered contract',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('protocol_contract_deployer')!;

    let block = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(deployer_2, callbackContract))],
        deployer.address
      ),
      Tx.contractCall(
        dlcManagerContract,
        'is-contract-registered',
        [types.principal(contractPrincipal(deployer_2, callbackContract))],
        deployer_2.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectBool(true);
  },
});

Clarinet.test({
  name: 'is-contract-registered returns false for unregistered contract',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const deployer_2 = accounts.get('protocol_contract_deployer')!;

    let block = chain.mineBlock([
      Tx.contractCall(
        dlcManagerContract,
        'register-contract',
        [types.principal(contractPrincipal(deployer_2, callbackContract))],
        deployer.address
      ),
      Tx.contractCall(
        dlcManagerContract,
        'unregister-contract',
        [types.principal(contractPrincipal(deployer_2, callbackContract))],
        deployer.address
      ),
      Tx.contractCall(
        dlcManagerContract,
        'is-contract-registered',
        [types.principal(contractPrincipal(deployer_2, callbackContract))],
        deployer_2.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectBool(false);
  },
});
