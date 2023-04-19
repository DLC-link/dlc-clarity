;; TODO: update ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM for mainnet

;; Traits
(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-link-callback-trait-v2.dlc-link-callback-trait)
(impl-trait .usda-loans-trait-v1-1.usda-loans-trait)
(use-trait usda-pool-trait .usda-pool-trait-v1-1.usda-pool-trait)

;; Errors
(define-constant ERR_DISABLED (err u330000))
(define-constant ERR_UNAUTHORIZED (err u330001))
(define-constant ERR_UNKNOWN_LOAN (err u330002))
(define-constant ERR_NO_DLC (err u330003))
(define-constant ERR_WRONG_STATUS (err u330004))
(define-constant ERR_WRONG_POOL (err u330005))
(define-constant ERR_UNTRUSTED_ORACLE (err u330006))
(define-constant ERR_INSUFFICIENT_COLLATERAL (err u330007))
(define-constant ERR_CHECK_LIQUIDATION (err u330008))

;; Constants
(define-constant DLC_MANAGER 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1)
(define-constant ORACLE_SYMBOL_BTC 0x425443)

;; Status Enum
(define-constant STATUS_CREATED "created")
(define-constant STATUS_OPENED "opened")
(define-constant STATUS_FUNDED "funded")
(define-constant STATUS_START_CLOSE "start-close")
(define-constant STATUS_CLOSED "closed")
(define-constant STATUS_START_LIQUIDATION "start-liquidation")
(define-constant STATUS_LIQUIDATED "liquidated")

;; Variables
(define-data-var contract-enabled bool true)
(define-data-var next-loan-id uint u0)
(define-data-var usda-pool principal .usda-pool-v1-1)
(define-data-var liquidation-ratio uint u14000)
(define-data-var liquidation-fee uint u1000)
(define-data-var stability-fee uint u4000000) ;; 4%
(define-data-var stability-fee-min uint u4000000) ;; 4%
(define-data-var stability-fee-max uint u20000000) ;; 20%
(define-data-var stability-fee-breakpoint uint u70000000) ;; 70%
(define-data-var cumm-fee-per-borrow uint u0)
(define-data-var last-fee-change-block uint u0)

;; Maps
(define-map loans
  uint                              ;; loan ID
  {
    loan-id: uint,                  ;; loan ID
    creator: principal,             ;; loan creator
    dlc-uuid: (optional (buff 32)), ;; DLC UUID once DLC is succesfully created
    status: (string-ascii 17),      ;; status of DLC
    open-block: uint,               ;; block on which loan was created
    stability-fee-paid: uint,       ;; stability fee already paid
    stability-fee-accrued: uint,    ;; accrued stability fee
    cumm-fee-per-borrow: uint,      ;; cummulative fee, used to calculate outstanding fees
    borrowed-amount: uint,          ;; the amount that is borrowed
    collateral: uint,               ;; BTC collateral in sats
    liquidation-ratio: uint,        ;; the collateral/loan ratio below which liquidation can happen
    liquidation-fee: uint,          ;; additional fee taken during liquidation
  }
)

(define-map creator-loan-ids principal (list 50 uint))

(define-map uuid-loan-id (buff 32) uint)

;; ---------------------------------------------------------
;; Getters
;; ---------------------------------------------------------

;; @desc get contract enabled
(define-read-only (get-contract-enabled)
  (var-get contract-enabled)
)

;; @desc get all loan info
(define-read-only (get-loan (loan-id uint))
  (map-get? loans loan-id)
)

;; @desc get all loan IDs for given creator
(define-read-only (get-creator-loan-ids (creator principal))
  (default-to
    (list)
    (map-get? creator-loan-ids creator)
  )
)

;; @desc get all loans info for given creator
(define-read-only (get-creator-loans (creator principal))
  (let (
    (loan-ids (get-creator-loan-ids creator))
  )
    (map get-loan loan-ids)
  )
)

;; @desc get loan ID for given DLC UUID
(define-read-only (get-loan-id-by-uuid (uuid (buff 32)))
  (map-get? uuid-loan-id uuid)
)

;; @desc get next loan ID
(define-read-only (get-next-loan-id)
  (var-get next-loan-id)
)

;; @desc get contract settings
(define-read-only (get-settings)
  {
    usda-pool: (var-get usda-pool),
    liquidation-ratio: (var-get liquidation-ratio),
    liquidation-fee: (var-get liquidation-fee),
    stability-fee: (var-get stability-fee),
    stability-fee-min: (var-get stability-fee-min),
    stability-fee-max: (var-get stability-fee-max),
    stability-fee-breakpoint: (var-get stability-fee-breakpoint),
    cumm-fee-per-borrow: (var-get cumm-fee-per-borrow),
    last-fee-change-block: (var-get last-fee-change-block)
  }
)

;; ---------------------------------------------------------
;; Open loan
;; ---------------------------------------------------------

;; @desc create a new loan
;; @param btc-deposit; amount of BTC to deposit as collateral, in sats
;; @post uint; loan ID
(define-public (create-loan (btc-deposit uint))
  (let (
    (loan-id (var-get next-loan-id))
    (current-loan-ids (get-creator-loan-ids tx-sender))
    (new-cumm-fee-per-borrow (unwrap-panic (increase-cumm-fee-per-borrow)))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)

    (unwrap-panic (as-contract (contract-call?
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1 create-dlc
      u1986707736
      .usda-loans-v1-1
      loan-id
    )))

    (map-set loans loan-id {
      loan-id: loan-id,
      creator: tx-sender,
      dlc-uuid: none,
      status: STATUS_CREATED,
      open-block: block-height,
      stability-fee-paid: u0,
      stability-fee-accrued: u0,

      cumm-fee-per-borrow: new-cumm-fee-per-borrow,

      borrowed-amount: u0,
      collateral: btc-deposit,
      liquidation-ratio: (var-get liquidation-ratio),
      liquidation-fee: (var-get liquidation-fee),
    })

    (map-set creator-loan-ids tx-sender (unwrap-panic (as-max-len? (append current-loan-ids loan-id) u50)))

    (var-set next-loan-id (+ loan-id u1))

    (ok loan-id)
  )
)

;; @desc callback function after creating DLC
;; @param loan-id; loan ID as passed when creating the DLC
;; @param dlc-uuid; UUID from created DLC
;; @post bool; true if succeeded
(define-public (post-create-dlc-handler (loan-id uint) (dlc-uuid (buff 32)))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
  )
    (asserts! (is-eq contract-caller DLC_MANAGER) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status loan) STATUS_CREATED) ERR_WRONG_STATUS)

    (map-set loans loan-id (merge loan { dlc-uuid: (some dlc-uuid), status: STATUS_OPENED }))
    (map-set uuid-loan-id dlc-uuid loan-id)
    (ok true)
  )
)

;; @desc callback function after funding DLC
;; @param dlc-uuid; UUID from created DLC
;; @post bool; true if succeeded
(define-public (set-status-funded (dlc-uuid (buff 32)))
  (let (
    (loan-id (unwrap! (get-loan-id-by-uuid dlc-uuid) ERR_UNKNOWN_LOAN))
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
  )
    (asserts! (is-eq contract-caller DLC_MANAGER) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status loan) STATUS_OPENED) ERR_WRONG_STATUS)

    (map-set loans loan-id (merge loan { status: STATUS_FUNDED }))
    (ok true)
  )
)

;; @desc borrow tokens
;; @param loan-id; the loan
;; @param amount; the amount to borrow
;; @param pool; USDA pool to borrow from
;; @param oracle-timestamp; timestamp when oracle price was signed
;; @param oracle-value; oracle price value
;; @param oracle-signature; oracle signature for value at time
;; @post uint; the amount borrowed
(define-public (borrow (loan-id uint) (amount uint) (pool <usda-pool-trait>) (oracle-timestamp uint) (oracle-value uint) (oracle-signature (buff 65)))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
    (new-borrowed-amount (+ (get borrowed-amount loan) amount))

    (oracle-entries (list { symbol: ORACLE_SYMBOL_BTC, value: oracle-value }))
    (oracle-signer (try! (contract-call? 'STDBEG5X8XD50SPM1JJH0E5CTXGDV5NJTJTTH7YB.redstone-verify recover-signer oracle-timestamp oracle-entries oracle-signature)))
    (collateral-value (/ (* (get collateral loan) oracle-value) u100000000))
    (strike-value (/ (* new-borrowed-amount (var-get liquidation-ratio)) u100))

    (new-cumm-fee-per-borrow (unwrap-panic (increase-cumm-fee-per-borrow)))
    (new-fee-accrued (get-outstanding-stability-fee loan-id))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (is-eq tx-sender (get creator loan)) ERR_UNAUTHORIZED)
    (asserts! (is-eq (var-get usda-pool) (contract-of pool)) ERR_WRONG_POOL)
    (asserts! (is-eq (get status loan) STATUS_FUNDED) ERR_WRONG_STATUS)
    (asserts! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1 is-trusted-oracle oracle-signer) ERR_UNTRUSTED_ORACLE)
    ;; (asserts! (> collateral-value strike-value) ERR_INSUFFICIENT_COLLATERAL)

    (try! (contract-call? pool withdraw amount (get creator loan)))
    (try! (pool-changed-internal pool))

    (map-set loans loan-id (merge loan { borrowed-amount: new-borrowed-amount, cumm-fee-per-borrow: new-cumm-fee-per-borrow, stability-fee-accrued: new-fee-accrued }))
    (ok amount)
  )
)

;; @desc repay tokens
;; @param loan-id; the loan
;; @param amount; the amount to repay
;; @param pool; USDA pool to repay to
;; @post uint; the actual amount repaid, without fees
(define-public (repay (loan-id uint) (amount uint) (pool <usda-pool-trait>))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
    (stability-fee-left (get-outstanding-stability-fee loan-id))
    (repay-amount (- amount stability-fee-left))
    (new-borrowed-amount (- (get borrowed-amount loan) repay-amount))
    (new-cumm-fee-per-borrow (unwrap-panic (increase-cumm-fee-per-borrow)))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (is-eq tx-sender (get creator loan)) ERR_UNAUTHORIZED)
    (asserts! (is-eq (var-get usda-pool) (contract-of pool)) ERR_WRONG_POOL)
    (asserts! (is-eq (get status loan) STATUS_FUNDED) ERR_WRONG_STATUS)

    (if (is-eq repay-amount u0)
      u0
      (try! (contract-call? pool deposit repay-amount))
    )

    (if (is-eq stability-fee-left u0)
      true
      (try! (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer stability-fee-left tx-sender (as-contract tx-sender) none))
    )

    (try! (pool-changed-internal pool))

    (map-set loans loan-id (merge loan {
      borrowed-amount: new-borrowed-amount,
      cumm-fee-per-borrow: new-cumm-fee-per-borrow,
      stability-fee-paid: (+ (get stability-fee-paid loan) stability-fee-left),
      stability-fee-accrued: (+ (get stability-fee-accrued loan) stability-fee-left),
    }))

    (ok repay-amount)
  )
)

;; ---------------------------------------------------------
;; Close loan
;; ---------------------------------------------------------

;; @desc repay the loan and get back the deposited collateral
;; @param loan-id; the loan to close
;; @post uint; closed loan ID
(define-public (close-loan (loan-id uint) (pool <usda-pool-trait>))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
    (dlc-uuid (unwrap! (get dlc-uuid loan) ERR_NO_DLC))
    (borrowed-amount (get borrowed-amount loan))
    (stability-fee-left (get-outstanding-stability-fee loan-id))
    (new-cumm-fee-per-borrow (unwrap-panic (increase-cumm-fee-per-borrow)))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (is-eq (var-get usda-pool) (contract-of pool)) ERR_WRONG_POOL)
    (asserts! (is-eq (get creator loan) tx-sender) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status loan) STATUS_FUNDED) ERR_WRONG_STATUS)

    (if (is-eq borrowed-amount u0)
      u0
      (try! (contract-call? pool deposit borrowed-amount))
    )

    (if (is-eq stability-fee-left u0)
      true
      (try! (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer stability-fee-left tx-sender (as-contract tx-sender) none))
    )

    (try! (pool-changed-internal pool))

    (map-set loans loan-id (merge loan {
      borrowed-amount: u0,
      cumm-fee-per-borrow: new-cumm-fee-per-borrow,
      stability-fee-paid: (+ (get stability-fee-paid loan) stability-fee-left),
      stability-fee-accrued: (+ (get stability-fee-accrued loan) stability-fee-left),
      status: STATUS_START_CLOSE
    }))
    (try! (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1 close-dlc dlc-uuid u0)))
    (ok loan-id)
  )
)

;; @desc callback function after closing DLC
;; @param dlc-uuid; UUID from closed DLC
;; @post bool; true if succeeded
(define-public (post-close-dlc-handler (dlc-uuid (buff 32)))
  (let (
    (loan-id (unwrap! (get-loan-id-by-uuid dlc-uuid) ERR_UNKNOWN_LOAN))
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
  )
    (asserts! (is-eq contract-caller DLC_MANAGER) ERR_UNAUTHORIZED)
    (asserts! (or (is-eq (get status loan) STATUS_START_CLOSE) (is-eq (get status loan) STATUS_START_LIQUIDATION)) ERR_WRONG_STATUS)

    (begin
      (if (is-eq (get status loan) STATUS_START_CLOSE)
        (map-set loans loan-id (merge loan { status: STATUS_CLOSED }))
        (map-set loans loan-id (merge loan { status: STATUS_LIQUIDATED }))
      )
    )
    (ok true)
  )
)

;; ---------------------------------------------------------
;; Liquidate loan
;; ---------------------------------------------------------

;; @desc liquidate a loan
;; @param loan-ID; the loan to liquidate
;; @post uint; liquidated loan ID
(define-public (liquidate-loan (loan-id uint))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
    (dlc-uuid (unwrap! (get dlc-uuid loan) ERR_NO_DLC))
  )
    (try! (contract-call? .main check-is-enabled))
    (asserts! (get-contract-enabled) ERR_DISABLED)
    (asserts! (is-eq (get status loan) STATUS_FUNDED) ERR_WRONG_STATUS)

    (try! (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1 get-btc-price dlc-uuid)))

    (ok loan-id)
  )
)

;; @desc callback function after requesting BTC price to check if liquidation needed
;; @param dlc-uuid; current BTC price
;; @param dlc-uuid; UUID for DLC
;; @post bool; true if succeeded
(define-public (get-btc-price-callback (btc-price uint) (dlc-uuid (buff 32)))
  (let (
    (loan-id (unwrap! (get-loan-id-by-uuid dlc-uuid) ERR_UNKNOWN_LOAN))
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
  )
    (asserts! (is-eq contract-caller DLC_MANAGER) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status loan) STATUS_FUNDED) ERR_WRONG_STATUS)
    (asserts! (try! (check-liquidation loan-id btc-price)) ERR_CHECK_LIQUIDATION)

    (let (
      (payout-ratio (try! (get-payout-ratio loan-id btc-price)))
    )
      (map-set loans loan-id (merge loan { status: STATUS_START_LIQUIDATION }))
      (try! (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1 close-dlc dlc-uuid payout-ratio)))
      (ok true)
    )
  )
)

;; @desc check if liquidation is needed for given loan
;; @param laon-id; the loan
;; @param btc-price: current BTC price
;; @post bool; true if liquidation is needed
(define-read-only (check-liquidation (loan-id uint) (btc-price uint))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))

    (stability-fee-left (get-outstanding-stability-fee loan-id))
    (total-borrowed (+ (get borrowed-amount loan) stability-fee-left))

    (collateral-value (/ (* (get collateral loan) btc-price) u100000000))
    (strike-value (/ (* total-borrowed (var-get liquidation-ratio)) u100))
  )
    (asserts! (is-eq (get status loan) STATUS_FUNDED) (ok false))
    (ok (< collateral-value strike-value))
  )
)

;; @desc Returns the resulting payout-ratio at the given btc-price
;; It's a value between 0.00-100.00 with 2 decimals (0-10000)
;; 0.00 means the borrower gets back its deposit, 100.00 means the entire collateral is taken
;; @param laon-id; the loan
;; @param btc-price: current BTC price
;; @post uint; the payout ratio
(define-read-only (get-payout-ratio (loan-id uint) (btc-price uint))
  (let (
    (loan (unwrap! (map-get? loans loan-id) ERR_UNKNOWN_LOAN))
    (collateral-value (/ (* (get collateral loan) btc-price) u100000000))

    (stability-fee-left (get-outstanding-stability-fee loan-id))
    (total-borrowed (+ (get borrowed-amount loan) stability-fee-left))

    ;; Need to multiply by 100 first as borrowed-amount has 6 decimals while collateral-value has 8
    (percentage (/ (* total-borrowed u100 u100000000) collateral-value))
    (percentage-fees (/ (* (get liquidation-fee loan) percentage) u10000))
    (ratio (/ (+ percentage percentage-fees) u10000))
  )
    (if (>= ratio u10000)
      (ok u10000)
      (ok ratio)
    )
  )
)

;; ---------------------------------------------------------
;; Stability fee
;; ---------------------------------------------------------

;; @desc get outstanding stability fee for given loan
;; @param loan-id; the loan
;; @post uint; the owed stability fee
(define-read-only (get-outstanding-stability-fee (loan-id uint))
  (let (
    (loan (unwrap! (map-get? loans loan-id) u0))
    (stability-fee-paid (get stability-fee-paid loan))

    (next-cumm-fee-per-borrow (unwrap-panic (calculate-cumm-fee-per-borrow)))
    (stability-fee-new (/ (* (- next-cumm-fee-per-borrow (get cumm-fee-per-borrow loan)) (get borrowed-amount loan)) u10000000000))
    (stability-fee-total (+ stability-fee-new (get stability-fee-accrued loan)))
  )
    (- stability-fee-total stability-fee-paid)
  )
)

;; @desc calculate new cummulative fee per 1 USDA borrowed and save
;; @post uint; the cummulative fee
(define-public (increase-cumm-fee-per-borrow)
  (let (
    (new-cumm-fee-per-borrow (unwrap-panic (calculate-cumm-fee-per-borrow)))
  )
    (var-set cumm-fee-per-borrow new-cumm-fee-per-borrow)
    (var-set last-fee-change-block block-height)
    (ok new-cumm-fee-per-borrow)
  )
)

;; @desc calculate new cummulative fee per 1 USDA borrowed
;; @post uint; the cummulative fee
(define-read-only (calculate-cumm-fee-per-borrow)
  (let (
    (yearly-fee (var-get stability-fee))
    (yearly-blocks (* u144 u365))
    (blocks-passed (- block-height (var-get last-fee-change-block)))
  )
    (asserts! (> block-height (var-get last-fee-change-block)) (ok (var-get cumm-fee-per-borrow)))
    (let (
      (next-cumm-fee-per-borrow (/ (* (/ (* blocks-passed u100000000) yearly-blocks) yearly-fee) u1000000))
    )
      (ok (+ (var-get cumm-fee-per-borrow) next-cumm-fee-per-borrow))
    )
  )
)

;; ---------------------------------------------------------
;; Pool changed
;; ---------------------------------------------------------

;; @desc signal that the pool has changed because of withdraw/deposit
;; @post uint; the new stability fee
(define-public (pool-changed-internal (pool <usda-pool-trait>))
  (let (
    (pool-balances (unwrap-panic (contract-call? pool get-pool-balances)))
  )
    (asserts! (is-eq (var-get usda-pool) (contract-of pool)) ERR_WRONG_POOL)
    (pool-changed-helper (get staked pool-balances) (get used pool-balances))
  )
)

;; @desc signal that the pool has changed because of stake/unstake
;; @post uint; the new stability fee
(define-public (pool-changed (amount-staked uint) (amount-used uint))
  (begin
    (asserts! (is-eq (var-get usda-pool) contract-caller) ERR_UNAUTHORIZED)

    (pool-changed-helper amount-staked amount-used)
  )
)

;; @desc helper to set new stability fee based on pool usage
;; @post uint; the new stability fee
(define-private (pool-changed-helper (amount-staked uint) (amount-used uint))
  (let (
    (new-stability-fee (calculate-stability-fee amount-staked amount-used))
  )
    (var-set stability-fee new-stability-fee)
    (ok new-stability-fee)
  )
)

;; @desc calculate new stability fee based on pool usage
;; @post uint; the new stability fee
(define-read-only (calculate-stability-fee (amount-staked uint) (amount-used uint))
  (if (is-eq amount-staked u0)
    (var-get stability-fee-min)
    (let (
      (usage-percentage (/ (* amount-used u100000000) amount-staked))
    )
      (if (< usage-percentage (var-get stability-fee-breakpoint))
        (var-get stability-fee-min)
        (let (
          (fee-range (- (var-get stability-fee-max) (var-get stability-fee-min)))
          (breakpoint-range (- u100000000 (var-get stability-fee-breakpoint)))
          (breakpoint-over (- usage-percentage (var-get stability-fee-breakpoint)))
          (fee-extra (/ (* (/ (* breakpoint-over u1000000) breakpoint-range) fee-range) u1000000))
        )
          (+ (var-get stability-fee-min) fee-extra)
        )
      )
    )
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

;; @desc set liquidation ration and fee
;; @param ratio; new liquidation ratio
;; @param fee; new liquidation fee
;; @post bool; true if successful
(define-public (set-liquidation-info (ratio uint) (fee uint))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set liquidation-ratio ratio)
    (var-set liquidation-fee fee)
    (ok true)
  )
)

;; @desc set stability fee
;; @param fee; new stability fee
;; @post bool; true if successful
(define-public (set-stability-fee (fee uint))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set stability-fee fee)
    (ok true)
  )
)

;; @desc set stability fee min and max
;; @param fee-min; new min stability fee
;; @param fee-max; new max stability fee
;; @post bool; true if successful
(define-public (set-stability-fee-min-max (fee-min uint) (fee-max uint))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set stability-fee-min fee-min)
    (var-set stability-fee-max fee-max)
    (ok true)
  )
)

;; @desc set stability fee breakpoint
;; @param fee; new stability fee breakpoint
;; @post bool; true if successful
(define-public (set-stability-fee-breakpoint (breakpoint uint))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set stability-fee-breakpoint breakpoint)
    (ok true)
  )
)

;; @desc set USDA pool to borrow from
;; @param pool; new pool
;; @post bool; true if successful
(define-public (set-usda-pool (pool <usda-pool-trait>))
  (begin
    (try! (contract-call? .main check-is-owner tx-sender))
    (var-set usda-pool (contract-of pool))
    (ok true)
  )
)

;; @desc claim all stability fees
;; @post uint; total fees claimed
(define-public (claim-stability-fees)
  (let (
    (owner tx-sender)
    (fees (unwrap-panic (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token get-balance (as-contract tx-sender))))
  )
    (try! (contract-call? .main check-is-owner tx-sender))
    (try! (as-contract (contract-call? 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.usda-token transfer fees tx-sender owner none)))
    (ok fees)
  )
)
