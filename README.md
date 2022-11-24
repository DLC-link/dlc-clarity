# stacks-contracts-all

This is a utility repository, which brings in all Stacks contracts' repositories as submodules for easy deployment.

## Useful to note
### Run deployment plan with setups
```bash
$ clarinet integrate -p deployments/custom.devnet-plan.yaml 
```
### To run in background
Without these steps, clarinet integrate stops when the tty session is ended by logging out.
 - start a tmux session:
```
$ tmux 
```
 - start integration
```
$ clarinet integrate -p deployments/custom.devnet-plan.yaml 
```
 - put tmux session in background
` ctrl+b ` , then `d`
 - now we can safely log out of the session
 - to reattach: 
```
$ tmux attach 
```

Also see: https://askubuntu.com/questions/8653/how-to-keep-processes-running-after-ending-ssh-session

## Steps to restart mocknet environment
1. node2 (electrs-btc2.dlc.link):
   1. Stop electrs in tmux window (optional)
   2. Stop bitcoind: `bitcoin-cli stop`
   3. Remove regtest folder: `rm -rf ~/.bitcoin/regtest`
2. node1 (stx-btc1.dlc.link):
   1. stop clarinet in tmux window
   2. free up some space: `docker image prune` and `docker volume prune`
   3. clear cache data `rm -rf .cache/*`
   4. make necessary changes in node/clarinet/contracts
   5. restart clarinet in tmux: `clarinet integrate -p deployments/custom.devnet-plan.yaml`
3. node2:
   1. Restart bitcoind: `bitcoind -daemon -regtest`
   2. Check health : `bitcoin-cli -regtest getblockchaininfo` should show same blockheight as node1
   3. Recreate "alice" wallet: `bitcoin-cli -regtest createwallet "alice"`
   4. Get a new address for alice: `bitcoin-cli -regtest -rpcwallet=alice getnewaddress "legacy"` (legacy seems to work best with clarinet)
4. node1:
   1. Copy alice's new address into ~/stacks-contracts-all/deployments/btc-transfer.devnet-plan.yaml into the recipient
   2. Apply the deployment plan inside the folder: `clarinet deployments apply -p deployments/btc-transfer.devnet-plan.yaml` press 'y' when prompted
5. node2:
   1. Check if alice got the funds: `bitcoin-cli -regtest -rpcwallet=alice getbalance`

