Join our Discord server for news and support!

[![Discord Banner](https://discordapp.com/api/guilds/887360470955208745/widget.png?style=banner2)](https://discord.gg/JAkbs92N5H)

# DLC.Link Stacks Smart Contracts

This smart contract is the interface for creating, closing and otherwise managing DLCs via the DLC.Link infrastructure.

Learn more about [DLCs](https://github.com/DLC-link/stacks-contracts-all/#what-are-dlcs) and [DLC.Link](https://github.com/DLC-link/stacks-contracts-all/#about-dlc-link) below.

# Overview

A DLC requires an oracle to attest to a specific outcome among the predefined set of outcomes.

This contract acts to feed the outcome of the DLC. By using a smart contract for this task, the implementation of the logic, as well as the data being used, is stamped on the chain, and is visible and reviewable by everyone.

# How to interact with this contract

## Clarity Traits
The following Clarity Traits must be implemented to interact with this contract. See `/contracts/dlc-link-callback-trait.clar`
### `post-create-dlc-handler`
Used to callback into the calling/protocol contract to provide the uuid of the created DLC, which will be used to reference the DLC going forward.

Parameters:

* `nonce`: uint - an ID used to associate a create function call with the callback
* `uuid`: string - UUID of the DLC

### `post-close-dlc-handler`
Used to callback into the calling/protocol contract to notify when a DLC is closed successfully.

Parameters:

* `uuid`: string - UUID of the DLC

### `get-btc-price-callback`
This callback is used to provide a way to hand back BTC price data, validated by Redstone. This value then can be used on the protocol side to decide liquidations, etc.

Parameters:

* `price`: uint - Redstone validated BTC price. Shifted by 10**8
* `uuid`: string - DLC UUID

### `set-staus-funded`
When a DLC is properly set up on the _Bitcoin_ blockchain, the DLC.Link infrastructure will use this function to notify Stacks of it's success.
This allows the contracts to have confirmation about the DLC's status.

Parameters:

* `uuid`: string - UUID of the DLC that was succesfully funded on BTC

## Functions to call
### Register contract

This must be run first by a DLC.Link admin. This authorizes your contract to interact with our DLC Manager contract and to be listened to by our listeners. This happens once, and should happen first before anything else.

Parameters:
`contract-address`:Principal

### Unregister Contract
Used to unregister a contract from the list of authorized contracts

Parameters
`contract-address`:Principal

### Opening a DLC

When you register a DLC with this contract using the `create-dlc` function, a DLC is set up on our DLC Oracles with the associated outcomes (CETs).

See the comments in the contract for further information about using this function.

Parameters:

* `emergency-refund-time`:uint - UNIX timestamp after which the DLC can be reclaimed by either party
* `callback-contract`:principal - The contract that sends the request, and will accept the callback.
* `nonce`:uint - the protocol/user provided ID to associate with the UUID

### Closing the DLC

The `close-dlc` function initiates the DLC closing flow. The supplied outcome will be relayed to the DLC Oracles through the DLC.Link Infrastructure, and it's value signed on the payout curve. The outcome must be between 0-10000: this represents 0-100.00% payouts, with two decimals precision. A value of 0 represents all value locked in the DLC to return to the user, 10000 means all BTC goes to the protocol (the other party in the DLC).

**_NOTE:_** To close a DLC successfully you have to set a trusted oracle first (the oracle used in the deployed contract and scripts is already set on Testnet)

Parameters:

* `uuid`:string
* `outcome`:number - a value between 0-10000 inclusive

### Other noteworthy functions

`get-btc-price(uuid)` : calling this function initiates a price-fetching flow on our backend. BTC price is fetched and validated by Redstone, and returned through the `get-btc-price-callback` callback function. This value then can be used to check liquidations, etc. See our sample contract for a full loan implementation: [sample-contract-loan](examples/sample-contract-loan.clar)

## About Redstone

- [Intro article](https://stacks.org/redstone)
- [Reference implementation](https://github.com/Clarity-Innovation-Lab/redstone-clarity-connector)

**_NOTE:_** the integration so this implementation as well depends on [micro-stacks](https://github.com/fungible-systems/micro-stacks) which is in alpha state and not audited, so use this in production with caution.

Flow of the Redstone oracle requests:

1. submit trusted oracle (node public keys can be found [here](https://github.com/redstone-finance/redstone-node/blob/main/src/config/nodes.json), this repo uses `redstone`)
2. when trying to close a DLC, submit a `timestamp`, `data package` and a `signature` as well with the UUID, which can be obtained from the [redstone-api-extended](https://www.npmjs.com/package/redstone-api-extended) module. For reference check the `close-dlc-internal.ts` script.

The Redstone data-package verification contract is included in the `.requirements/` folder for the purposes of deploying it during Mocknet testing. In production and testnet, the on-chain contracts are used, which can be found here:

[redstone-verify on Testnet](https://explorer.stacks.co/txid/0x35952be366691c79243cc0fc43cfcf90ae71ed66a9b6d9578b167c28965bbf7e?chain=testnet)

[redstone-verify on Mainnet](https://explorer.stacks.co/txid/0x8de1fb0a41d6a8a962c8016c3a5178176fc51c206afa72f71f5747a6246a37bb?chain=mainnet)

# Contributing

We are happy to have support and contribution from the community. Please find us on Discord and see below for developer details.

# Tests

Run

```console
clarinet test
```

For test coverage run

```console
clarinet test --coverage
```

And install lcov

```console
brew install lcov
genhtml coverage.lcov
open index.html
```
## Useful to note

### Small App for scripts
This repo contains a small react app to help running small scripts & showcasing some interactions with our contracts. It is a work in progress. Can be found [here](app/).
### Mocknet deployment

This repo temporarily contains the older versions of our contracts in the `legacy-contracts` folder.
The following command deploys all our contracts and maked the necessary setups for testing.

```bash
$ clarinet integrate -p deployments/custom.devnet-plan.yaml
```

# What Are DLCs

[Discreet Log Contracts](https://dci.mit.edu/smart-contracts) (DLCs) facilitate conditional payments on Bitcoin between two or more parties. By creating a Discreet Log Contract, two parties can form a monetary contract redistributing their funds to each other without revealing any details to the blockchain. Its appearance on the Bitcoin blockchain will be no different than an ordinary multi-signature output, so no external observer can learn its existence or details from the public ledger. A DLC is similar to a 2-of-3 multisig transaction where the third participant is an “oracle”. An oracle is a 3rd party source of data or information that the parties to the DLC trust as the source of truth for the contract. The oracle is incentivized to be a fair arbiter of the contract.

# About DLC Link

DLC.Link is building infrastructure to empower decentralized applications and smart contract developers to easily leverage the power of DLCs. We provide companies and applications with a traditional REST API and a smart contract interface to create and manage DLCs for their use cases.

DLCs require an oracle to attest to a specific outcome among the predefined set of outcomes. That means trust.

Why power DLC oracles with smart contracts? By using a smart contract for this task, the implementation of the logic, as well as the data being used, is stamped on the chain, and is _visible and reviewable_ by everyone.

Unlike other DLC Oracle server solutions, DLC.link allows the DLCs to be configured with a simple interface, API or via smart contract, and to act on a wide-set of events and data sources through our decentralized infrastructure.

There are two types of events / data sources supported by DLC.link.

1. Off-chain pricing data, such as the current price of BTC, ETH, etc. In fact, any numeric data from Redstone Oracle Network is supported.

2. On-chain events, such as a completed transaction, a function call, etc. (Also, because Stacks can read the state of the BTC blockchain, actions can be taken directly on Stacks in response to funding transactions of DLCs on BTC. \*This is continuing to be researched, and may be dependent on this project: https://grants.stacks.org/dashboard/grants/235)
