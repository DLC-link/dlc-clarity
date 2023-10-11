#!/usr/bin/env node
require('dotenv').config();
import path from 'path';
import { Command } from 'commander';
const version = require('../../package.json').version;

import addAttestor from './01_register-attestor';
import getRegisteredAttestor from './02_get-registered-attestor';
import fetchAllAttestors from './03_fetch-all-attestors';
import deregisterAttestorByDNS from './04_deregister-attestor-by-dns';
import registerContract from './05_register-contract';
import getLoan from './07_sample-get-loan';
import setupLoan from './06_sample-setup-loan';
import closeLoan from './08_sample-close-loan';
import mintStablecoin from './09_mint-stablecoin';
import deployProtocolContract from './10_deploy-contract';
import setLiquidationFee from './11_set-liquidation-fee';
import setStatusFunded from './12_set-status-funded';
import setProtocolWallet from './13_set-protocol-wallet';
import sendSTXTo from './14_send-stx';
import deployAndSetupProtocolContract from './15_deploy-and-setup';

async function main() {
  const program = new Command();

  program.name('dlc-link-stacks').description('CLI scripts to help with DLC.Link utilities').version(`v${version}`);

  program
    .command('register-attestor')
    .description('register attestor')
    .argument('<address>', 'address of attestor')
    .action(addAttestor);

  program
    .command('get-registered-attestor')
    .description('get registered attestor by id')
    .argument('<id>', 'id of attestor')
    .action(getRegisteredAttestor);

  program.command('fetch-all-attestors').description('fetch all registered attestors').action(fetchAllAttestors);

  program
    .command('deregister-attestor-by-dns')
    .description('deregister attestor by dns')
    .argument('<address>', 'address of attestor')
    .action(deregisterAttestorByDNS);

  program
    .command('register-contract')
    .description('register contract')
    .argument('<address>', 'address of contract')
    .argument('<name>', 'name of contract')
    .action(registerContract);

  program
    .command('setup-loan')
    .description('setup loan in sample contract')
    .argument('[btcDeposit]', 'btc deposit', 100000000)
    .argument('[attestorIDs...]', 'ids of attestors', [0, 1, 2])
    .action(setupLoan);

  program
    .command('get-loan')
    .description('get loan by id from sample contract')
    .argument('<id>', 'id of the loan')
    .action(getLoan);

  program
    .command('close-loan')
    .description('close loan by id from sample contract')
    .argument('<id>', 'id of the loan')
    .action(closeLoan);

  program
    .command('mint-stablecoin')
    .description('mint stablecoin')
    .argument('<amount>', 'amount to mint')
    .argument('<recipient>', 'recipient of minted stablecoin')
    .action(mintStablecoin);

  program
    .command('deploy-protocol-contract')
    .description('deploy protocol contract')
    .argument('<path>', 'path to contract')
    .argument('<contractName>', 'name of contract')
    .argument('[deployerKey]', 'key of deployer')
    .action(deployProtocolContract);

  program
    .command('set-liquidation-fee')
    .description('set liquidation fee')
    .argument('<fee>', 'fee to set')
    .action(setLiquidationFee);

  program
    .command('set-status-funded')
    .description('set status funded')
    .argument('<uuid>', 'dlc uuid')
    .argument('[callbackContract]', 'callback contract')
    .action(setStatusFunded);

  program
    .command('set-protocol-wallet')
    .description('set protocol wallet in sample contract')
    .argument('<address>', 'protocol wallet address')
    .action(setProtocolWallet);

  program
    .command('send-stx')
    .description('send stx')
    .argument('<address>', 'address to send to')
    .argument('<amount>', 'amount to send')
    .action(sendSTXTo);

  program
    .command('deploy-and-setup')
    .description('deploy and setup protocol contract')
    .argument('<path>', 'path to contract')
    .argument('<contractName>', 'name of contract')
    .argument('[deployerKey]', 'key of deployer')
    .action(deployAndSetupProtocolContract);

  const rootDir = path.join(__dirname, '..');
  process.chdir(rootDir);

  await program.parseAsync(process.argv);
}

// ---- main entry point when running as a script

// make sure we catch all errors
main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
