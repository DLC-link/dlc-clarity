#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';

import getDLC from './02_get-dlc.js';
import getAllDLCs from './03_fetch-all-dlcs.js';
import registerContract from './05_register-contract.js';
import getLoan from './07_sample-get-loan.js';
import setupLoan from './06_sample-setup-loan.js';
import closeLoan from './08_sample-close-loan.js';
import mintStablecoin from './09_mint-stablecoin.js';
import deployProtocolContract from './10_deploy-contract.js';
import setLiquidationFee from './11_set-liquidation-fee.js';
import setStatusFunded from './12_set-status-funded.js';
import setProtocolWallet from './13_set-protocol-wallet.js';
import sendSTXTo from './14_send-stx.js';
// import deployAndSetupProtocolContract from './15_deploy-and-setup.js';

async function main() {
  const program = new Command();

  program.name('dlc-link-stacks').description('CLI scripts to help with DLC.Link utilities');

  program.command('get-dlc').description('get dlc').argument('<uuid>', 'uuid of dlc').action(getDLC);

  program.command('fetch-all-dlcs').description('fetch all DLCs').action(getAllDLCs);

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

  // program
  //   .command('deploy-and-setup')
  //   .description('deploy and setup protocol contract')
  //   .argument('<path>', 'path to contract')
  //   .argument('<contractName>', 'name of contract')
  //   .argument('[deployerKey]', 'key of deployer')
  //   .action(deployAndSetupProtocolContract);

  // const rootDir = path.join(__dirname, '..');
  // process.chdir(rootDir);

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
