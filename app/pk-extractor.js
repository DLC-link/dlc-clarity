import { StacksTestnet } from "@stacks/network";
import { generateWallet, restoreWalletAccounts } from "@stacks/wallet-sdk";
// for mainnet, use `StacksMainnet()` //choose between test or mainnet
const network = new StacksTestnet();
const secretKey = "";
const wallet = await generateWallet({ secretKey, password: "" });
const acc = await restoreWalletAccounts({
  wallet,
  gaiaHubUrl: "https://hub.blockstack.org",
  network,
});
console.log(acc);
