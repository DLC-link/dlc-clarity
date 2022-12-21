;;ERROR CODES
(define-constant err-untrusted-oracle (err u101))
(define-constant err-stale-data (err u102))
(define-constant err-unauthorised (err u2001))
(define-constant err-dlc-already-added (err u2002))
(define-constant err-unknown-dlc (err u2003))
(define-constant err-not-reached-closing-time (err u2004))
(define-constant err-already-closed (err u2005))
(define-constant err-already-passed-closing-time (err u2006))
(define-constant err-not-closed (err u2007))
(define-constant err-not-the-same-assets (err u2008))
(define-constant err-does-not-need-liquidation (err u3000))
(define-constant err-no-price-data (err u3001))
(define-constant err-cant-unwrap (err u3002))

(define-constant ten-to-power-2 u100)
(define-constant ten-to-power-8 u100000000)
(define-constant ten-to-power-16 u10000000000000000)

;; Status enums
(define-constant status-open u0)
(define-constant status-closed u10)

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-loan-v0)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-link-callback-trait.dlc-link-callback-trait)

;; A map of all trusted oracles, indexed by their 33 byte compressed public key.
(define-map trusted-oracles (buff 33) bool)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 8))

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

(define-map dlcs
  (buff 8)
  {
    uuid: (buff 8),
    vault-loan-amount: uint,
    liquidation-ratio: uint,
    liquidation-fee: uint,
    btc-deposit: uint,
    closing-price: (optional uint),
    actual-closing-time: uint,
    emergency-refund-time: uint,
    creator: principal,
    callback-contract: principal,
    status: uint
  })

(define-read-only (get-last-block-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

(define-read-only (get-dlc (uuid (buff 8)))
  (map-get? dlcs uuid))

(define-private (shift-value (value uint) (shift uint))
  (* value shift))

(define-private (unshift-value (value uint) (shift uint))
  (/ value shift))

(define-read-only (get-callback-contract (uuid (buff 8)))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (callback-contract (get callback-contract dlc))
    )
    (ok callback-contract)
  )
)

(define-public (set-status-funded (uuid (buff 8)) (callback-contract <cb-trait>))
  (ok (try! (contract-call? callback-contract set-status-funded uuid)))
)

;;emits an event - see README for more details
;;vault-loan-amount : the borrowed USDA amount in the vault, in pennies (e.g. 10000 USD : 1000000)
;;btc-deposit : the deposited BTC amount, in Sats (shifted by 10**8)
;;liquidation-ratio percentage with two decimal precision: e.g. 140% : 14000
;;liquidation-fee : same as ratio, e.g. 10% : 1000
;;emergency-refund-time: the time at which the DLC will be available for refund
;;callback-contract: the contract-principal where the create-dlc-internal will call back to
;;nonce provided for the dlc by the sample-protocol-contract to connect it to the resulting uuid
(define-public (create-dlc (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint) (callback-contract principal) (nonce uint))
  (let (
    ) 
    (begin
      (print {
        vault-loan-amount: vault-loan-amount, 
        btc-deposit: btc-deposit,
        liquidation-ratio: liquidation-ratio,
        liquidation-fee: liquidation-fee,
        emergency-refund-time: emergency-refund-time,
        creator: tx-sender,
        callback-contract: callback-contract,
        nonce: nonce,
        event-source: "dlclink:create-dlc:v0" 
      })
      (ok true)
    )
  ) 
)

;; Opens a new DLC - called by the DLC Oracle system
(define-public (create-dlc-internal (uuid (buff 8)) (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint) (creator principal) (callback-contract <cb-trait>) (nonce uint))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-none (map-get? dlcs uuid)) err-dlc-already-added)
    (map-set dlcs uuid {
      uuid: uuid, 
      vault-loan-amount: vault-loan-amount,
      liquidation-ratio: liquidation-ratio,
      liquidation-fee: liquidation-fee,
      btc-deposit: btc-deposit,
      closing-price: none, 
      actual-closing-time: u0, 
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      callback-contract: (contract-of callback-contract),
      status: status-open })
    (print {
      uuid: uuid, 
      vault-loan-amount: vault-loan-amount, 
      liquidation-ratio: liquidation-ratio,
      liquidation-fee: liquidation-fee,
      btc-deposit: btc-deposit,
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      event-source: "dlclink:create-dlc-internal:v0" 
    })
    (try! (contract-call? callback-contract post-create-dlc-handler nonce uuid))
    (nft-mint? open-dlc uuid dlc-manager-contract))) ;;mint an open-dlc nft to keep track of open dlcs
  

;; Regular, repaid loan closing request
(define-public (close-dlc (uuid (buff 8)))
  (let (
      (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq (get creator dlc) tx-sender)) err-unauthorised)
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (print { 
      uuid: uuid,
      creator: (get creator dlc),
      caller: tx-sender,
      event-source: "dlclink:close-dlc:v0"
      })
    (ok true)
  ))

;; Liquidating close request
(define-public (close-dlc-liquidate (uuid (buff 8))) 
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (print { 
      uuid: uuid,
      creator: (get creator dlc),
      caller: tx-sender,
      event-source: "dlclink:close-dlc-liquidate:v0" 
      })
    (ok true)
  ))

;; Regular closing of a DLC, without price data. Called by the DLC oracle service
(define-public (close-dlc-internal (uuid (buff 8)) (callback-contract <cb-trait>)) 
(let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (closing-price none)
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (map-set dlcs uuid (merge dlc { status: status-closed }))
    (print {
      uuid: uuid,
      closing-price: closing-price,
      event-source: "dlclink:close-dlc-internal:v0" })
    (try! (contract-call? callback-contract post-close-dlc-handler uuid closing-price))
    (nft-burn? open-dlc uuid dlc-manager-contract)))

;; Close the dlc with the oracle data. This is called by the DLC Oracle service
(define-public (close-dlc-liquidate-internal (uuid (buff 8)) (timestamp uint) (entries (list 10 {symbol: (buff 32), value: uint})) (signature (buff 65)) (callback-contract <cb-trait>))
  (let (
    ;; Recover the pubkey of the signer.
    (signer (try! (contract-call? 'STDBEG5X8XD50SPM1JJH0E5CTXGDV5NJTJTTH7YB.redstone-verify recover-signer timestamp entries signature)))
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (block-timestamp (get-last-block-timestamp))
    (price (unwrap! (get value (element-at entries u0)) err-no-price-data))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    ;; Check if the vault needs to be liquidated
    (asserts! (unwrap! (check-liquidation uuid price) err-cant-unwrap) err-does-not-need-liquidation)
    ;; Check if the signer is a trusted oracle.
    (asserts! (is-trusted-oracle signer) err-untrusted-oracle)
    ;; Check if the data is not stale, depending on how the app is designed.
    (asserts! (> timestamp block-timestamp) err-stale-data) ;; timestamp should be larger than the last block timestamp.
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (map-set dlcs uuid (merge dlc { closing-price: (get value (element-at entries u0)), actual-closing-time: (/ timestamp u1000), status: status-closed })) ;;timestamp is in milliseconds so we have to convert it to seconds to keep the timestamps consistent
    (print {
      uuid: uuid,
      payout-ratio: (get-payout-ratio uuid price),
      closing-price: price,
      actual-closing-time: (/ timestamp u1000),
      event-source: "dlclink:close-dlc-liquidate-internal:v0" })
    (try! (contract-call? callback-contract post-close-dlc-handler uuid (some price)))
    (nft-burn? open-dlc uuid dlc-manager-contract))) ;;burn the open-dlc nft related to the UUID

;; Checks if a given DLC needs liquidation at the given btc-price (shifted by 10**8)
;; Example params: uuid: 'someuuid', btc-price: 2400000000000 ($24,000)
(define-read-only (check-liquidation (uuid (buff 8)) (btc-price uint)) 
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (collateral-value (get-collateral-value (get btc-deposit dlc) btc-price))
    (strike-price (/ (* (get vault-loan-amount dlc) (get liquidation-ratio dlc)) u10000)) 
    )
    (ok (<= collateral-value strike-price))
  )
)

;; Returns the resulting payout-ratio at the given btc-price (shifted by 10**8).
;; This value is sent to the Oracle system for signing a point on the linear payout curve.
;; using uints, this means return values between 0-10000000000 (0.00-100.00 with room for extra precision in the future)
;; 0.00 means the borrower gets back its deposit, 100.00 means the entire collateral gets taken by the protocol.
(define-read-only (get-payout-ratio (uuid (buff 8)) (btc-price uint))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (collateral-value (get-collateral-value (get btc-deposit dlc) btc-price))
    ;; the ratio the protocol has to sell to liquidators:
    (sell-to-liquidators-ratio (/ (shift-value (get vault-loan-amount dlc) ten-to-power-16) collateral-value)) 
    ;; the additional liquidation-fee percentage is calculated into the result. Since it is shifted by 10000, we divide:
    (payout-ratio-precise (+ sell-to-liquidators-ratio (* (/ sell-to-liquidators-ratio u10000) (get liquidation-fee dlc))))
    ;; The final payout-ratio is a truncated version:
    (payout-ratio (unshift-value payout-ratio-precise ten-to-power-8))
    )
    ;; We cap result to be between the desired bounds
    (begin 
      (if (unwrap! (check-liquidation uuid btc-price) err-cant-unwrap)
          (if (>= payout-ratio (shift-value u1 ten-to-power-8)) 
            (ok (shift-value u1 ten-to-power-8)) 
            (ok payout-ratio))
        (ok u0)
      )  
    )
  )
)

;; Calculating loan collateral value for a given btc-price * (10**8), with pennies precision.
;; Since the deposit is in Sats, after multiplication we first shift by 2, then ushift by 16 to get pennies precision ($12345.67 = u1234567)
(define-private (get-collateral-value (btc-deposit uint) (btc-price uint))
  (unshift-value (shift-value (* btc-deposit btc-price) ten-to-power-2) ten-to-power-16)
)

(define-read-only (is-trusted-oracle (pubkey (buff 33)))
  (default-to false (map-get? trusted-oracles pubkey))
)

(define-public (set-trusted-oracle (pubkey (buff 33)) (trusted bool))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (ok (map-set trusted-oracles pubkey trusted))
  )
)

;; Admin function to register a protocol/user-contract
;; This is picked up by the Observer infrastructure to start listening to contract-calls of our public functions.
(define-public (register-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (print { 
      contract-address: contract-address,
      event-source: "dlclink:register-contract:v0" })
    (nft-mint? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-public (unregister-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (print { 
      contract-address: contract-address,
      event-source: "dlclink:unregister-contract:v0" })
    (nft-burn? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-read-only (is-contract-registered (contract-address principal))
  (is-some (nft-get-owner? registered-contract contract-address))
)
