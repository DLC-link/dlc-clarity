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