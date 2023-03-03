;; @contract USDA pool
;; Users can stake/unstake USDA in the pool and earn DIKO rewards
;; USDA in the pool will be used by borrowers
;; @version 1.0

;; Traits
(impl-trait .usda-pool-trait-v1-1.usda-pool-trait)
(use-trait usda-loans-trait .usda-loans-trait-v1-1.usda-loans-trait)

;; Errors
(define-constant ERR_DISABLED (err u220000))
(define-constant ERR_NOT_MANAGER (err u220001))
(define-constant ERR_REWARDS_CALC (err u220002))
(define-constant ERR_INSUFFICIENT_STAKE (err u220003))
(define-constant ERR_WRONG_LOANS_CONTRACT (err u220004))

;; Variables
(define-data-var contract-enabled bool true)
(define-data-var total-staked uint u0)
(define-data-var cumm-reward-per-stake uint u0)
(define-data-var last-reward-increase-block uint u0)
(define-data-var rewards-rate uint u100000) ;; 10% - TODO: set for mainnet
(define-data-var usda-loans principal .usda-loans-v1-1)

;; Track ammount and cummulative reward for staker
(define-map stakes
  { staker: principal }
  {
    amount: uint,
    cumm-reward-per-stake: uint
  }
)

;; Contracts allowed to deposit/withdraw
(define-map is-manager principal bool)

;; ---------------------------------------------------------
;; Getters
;; ---------------------------------------------------------

;; @desc get contract enabled
(define-read-only (get-contract-enabled)
  (var-get contract-enabled)
)

;; @desc get staker info
(define-read-only (get-stake-of (staker principal))
  (default-to
    { amount: u0, cumm-reward-per-stake: u0 }
    (map-get? stakes { staker: staker })
  )
)

;; @desc check if given contract is manager
(define-read-only (get-is-manager (contract principal))
  (default-to
    false
    (map-get? is-manager contract)
  )
)

;; @desc get variable total-staked
(define-read-only (get-total-staked)
  (var-get total-staked)
)

;; @desc get variable cumm-reward-per-stake
(define-read-only (get-cumm-reward-per-stake)
  (var-get cumm-reward-per-stake)
)

;; @desc get variable last-reward-increase-block
(define-read-only (get-last-reward-increase-block)
  (var-get last-reward-increase-block)
)

;; @desc get rewards rate
(define-read-only (get-rewards-rate)
  (var-get rewards-rate)
)

;; @desc get available funds to borrow
(define-read-only (get-total-available)
  (unwrap-panic (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token get-balance (as-contract tx-sender)))
)

;; @desc get used funds
(define-read-only (get-total-used)
  (let (
    (staked (var-get total-staked))
    (available (unwrap-panic (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token get-balance (as-contract tx-sender))))
  )
    (- staked available)
  )
)

;; @desc get pool balances
(define-read-only (get-pool-balances)
  (let (
    (staked (var-get total-staked))
    (available (unwrap-panic (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token get-balance (as-contract tx-sender))))
  )
    (ok {
      staked: staked,
      available: available,
      used: (- staked available)
    })
  )
)

;; ---------------------------------------------------------
;; Stake & Unstake
;; ---------------------------------------------------------

;; @desc stake tokens in the pool
;; @param amount; amount to stake
;; @param loans-trait; the loans contract to notify
;; @post uint; returns amount of tokens staked
(define-public (stake (amount uint) (loans-trait <usda-loans-trait>))
  (let (
    (staker tx-sender)
    (current-stake-amount (get amount (get-stake-of staker)))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (is-eq (var-get usda-loans) (contract-of loans-trait)) ERR_WRONG_LOANS_CONTRACT)

    ;; This method will increase the cumm-rewards-per-stake, and set it for the staker
    (try! (claim-pending-rewards))

    ;; Update total stake and increase cummulative rewards
    (var-set total-staked (+ (var-get total-staked) amount))
    (unwrap-panic (increase-cumm-reward-per-stake))

    ;; Transfer tokens and update map
    (try! (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer amount staker (as-contract tx-sender) none))
    (map-set stakes { staker: staker } { amount: (+ current-stake-amount amount), cumm-reward-per-stake: (var-get cumm-reward-per-stake) })

    ;; Update loans contract
    (try! (contract-call? loans-trait pool-changed (get-total-staked) (get-total-used)))

    (ok amount)
  )
)

;; @desc unstake tokens in the pool
;; @param amount; amount to unstake
;; @param loans-trait; the loans contract to notify
;; @post uint; returns amount of tokens unstaked
(define-public (unstake (amount uint) (loans-trait <usda-loans-trait>))
  (let (
    (staker tx-sender)
    (current-stake-amount (get amount (get-stake-of staker)))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (>= current-stake-amount amount) ERR_INSUFFICIENT_STAKE)
    (asserts! (is-eq (var-get usda-loans) (contract-of loans-trait)) ERR_WRONG_LOANS_CONTRACT)

    ;; This method will increase the cumm-rewards-per-stake, and set it for the staker
    (try! (claim-pending-rewards))

    ;; Update total stake and increase cummulative rewards
    (var-set total-staked (- (var-get total-staked) amount))
    (unwrap-panic (increase-cumm-reward-per-stake))

    ;; Transfer tokens and update map
    (try! (as-contract (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer amount tx-sender staker none)))
    (map-set stakes { staker: staker } { amount: (- current-stake-amount amount), cumm-reward-per-stake: (var-get cumm-reward-per-stake) })

    ;; Update loans contract
    (try! (contract-call? loans-trait pool-changed (get-total-staked) (get-total-used)))

    (ok amount)
  )
)

;; @desc unstake tokens without claiming rewards
;; @param amount; amount to unstake
;; @param loans-trait; the loans contract to notify
;; @post uint; returns unstaked amount
(define-public (emergency-unstake (amount uint) (loans-trait <usda-loans-trait>))
  (let (
    (staker tx-sender)
    (current-stake-amount (get amount (get-stake-of staker)))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (>= current-stake-amount amount) ERR_INSUFFICIENT_STAKE)
    (asserts! (is-eq (var-get usda-loans) (contract-of loans-trait)) ERR_WRONG_LOANS_CONTRACT)

    ;; Update total stake and increase cummulative rewards
    (var-set total-staked (- (var-get total-staked) amount))
    (unwrap-panic (increase-cumm-reward-per-stake))

    ;; Transfer tokens and update map
    (try! (as-contract (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer amount tx-sender staker none)))
    (map-set stakes { staker: staker } { amount: (- current-stake-amount amount), cumm-reward-per-stake: (var-get cumm-reward-per-stake) })

    ;; Update loans contract
    (try! (contract-call? loans-trait pool-changed (get-total-staked) (get-total-used)))

    (ok amount)
  )
)

;; ---------------------------------------------------------
;; User rewards
;; ---------------------------------------------------------

;; @desc get amount of pending rewards for staker
;; @param staker; staker to get pending rewards for
;; @post uint; returns pending rewards
(define-public (get-pending-rewards (staker principal))
  (let (
    (stake-amount (get amount (get-stake-of staker)))
    (current-cumm-reward (unwrap-panic (calculate-cumm-reward-per-stake)))
    (user-cumm-reward (get cumm-reward-per-stake (get-stake-of staker)))
    (amount-owed-per-token (- current-cumm-reward user-cumm-reward))
    (rewards-decimals (* stake-amount amount-owed-per-token))
    (rewards (/ rewards-decimals u1000000))
  )
    (ok rewards)
  )
)

;; @desc claim pending rewards
;; @post uint; returns claimed rewards
(define-public (claim-pending-rewards)
  (let (
    (staker tx-sender)
    (increase-result (unwrap-panic (increase-cumm-reward-per-stake)))
    (pending-rewards (unwrap! (get-pending-rewards staker) ERR_REWARDS_CALC))
    (stake-of (get-stake-of staker))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (>= pending-rewards u1) (ok u0))

    (try! (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.arkadiko-dao mint-token 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.arkadiko-token pending-rewards staker))
    (map-set stakes { staker: staker } (merge stake-of { cumm-reward-per-stake: (var-get cumm-reward-per-stake) }))
    (ok pending-rewards)
  )
)

;; @desc claim pending rewards and stake
;; @post uint; returns claimed rewards
;; TODO: enable for mainnet
;; (define-public (stake-pending-rewards)
;;   (let (
;;     (claimed-rewards (unwrap-panic (claim-pending-rewards)))
;;   )
;;     (try! (contract-call? 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-stake-registry-v1-1 stake
;;       'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-stake-registry-v1-1
;;       'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-stake-pool-diko-v1-2
;;       'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.arkadiko-token
;;       claimed-rewards
;;     ))
;;     (ok claimed-rewards)
;;   )
;; )

;; ---------------------------------------------------------
;; Cummulative rewards
;; ---------------------------------------------------------

;; @desc increase cummulative rewards per stake
;; @post uint; new cummulative rewards per stake
(define-public (increase-cumm-reward-per-stake)
  (let (
    (new-cumm-reward-per-stake (unwrap-panic (calculate-cumm-reward-per-stake)))
  )
    (var-set cumm-reward-per-stake new-cumm-reward-per-stake)
    (var-set last-reward-increase-block block-height)
    (ok new-cumm-reward-per-stake)
  )
)

;; @desc get the cumm rewards per stake for current block height
;; @post uint; the cummulative rewards per stake
(define-public (calculate-cumm-reward-per-stake)
  (let (
    (current-total-staked (var-get total-staked))
    (current-cumm-reward-per-stake (var-get cumm-reward-per-stake))
  )
    (asserts! (> block-height (var-get last-reward-increase-block)) (ok current-cumm-reward-per-stake))
    (asserts! (> current-total-staked u0) (ok current-cumm-reward-per-stake))

    (let (
      (total-block-rewards (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.arkadiko-diko-guardian-v1-1 get-staking-rewards-per-block))
      (block-diff (- block-height (var-get last-reward-increase-block)))
      (total-rewards-to-distribute (/ (* (var-get rewards-rate) block-diff total-block-rewards) u1000000))
      (reward-added-per-token (/ (* total-rewards-to-distribute u1000000) current-total-staked))
      (new-cumm-reward-per-stake (+ current-cumm-reward-per-stake reward-added-per-token))
    )
      (ok new-cumm-reward-per-stake)
    )
  )
)

;; @desc get the amount of DIKO rewards per block
;; @post uint; the rewards per block
(define-read-only (get-rewards-per-block)
  (let (
    (total-block-rewards (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.arkadiko-diko-guardian-v1-1 get-staking-rewards-per-block))
  )
    (/ (* (var-get rewards-rate) total-block-rewards) u1000000)
  )
)

;; ---------------------------------------------------------
;; Withdraw & deposit
;; ---------------------------------------------------------

;; @desc method to be used by loans contract to transfer USDA from user to pool
;; @param amount; amount to transfer
;; @post uint; the amount transfered
(define-public (deposit (amount uint))
  (begin
    (asserts! (get-is-manager contract-caller) ERR_NOT_MANAGER)

    (try! (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer amount tx-sender (as-contract tx-sender) none))
    (ok amount)
  )
)

;; @desc method to be used by loans contract to transfer USDA from pool to user
;; @param amount; amount to transfer
;; @post uint; the amount transfered
(define-public (withdraw (amount uint) (recipient principal))
  (begin
    (asserts! (get-is-manager contract-caller) ERR_NOT_MANAGER)

    (try! (as-contract (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer amount tx-sender recipient none)))
    (ok amount)
  )
)

;; ---------------------------------------------------------
;; Admin
;; ---------------------------------------------------------

;; @desc set contract enabled
;; @param enabled; if contract enabled
;; @post bool; true if successful
(define-public (set-contract-enabled (enabled bool))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set contract-enabled enabled)
    (ok true)
  )
)

;; @desc set manager to allow/disallow deposit/withdraw
;; @param manager; the manager principal
;; @param enabled; if manager is enabled
;; @post bool; true if successful
(define-public (set-manager (manager principal) (enabled bool))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (map-set is-manager manager enabled)
    (ok true)
  )
)

;; @desc set USDA loans contract
;; @param pool; new loans contract
;; @post bool; true if successful
(define-public (set-usda-loans (loans <usda-loans-trait>))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set usda-loans (contract-of loans))
    (ok true)
  )
)

;; ---------------------------------------------------------
;; Init
;; ---------------------------------------------------------

(begin
  (map-set is-manager .usda-loans-v1-1 true)
)
