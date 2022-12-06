;; Error codes
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
(define-constant err-no-price-data (err u2009))
(define-constant err-out-of-bounds-outcome (err u2010))

;; Status enums
(define-constant status-open u0)
(define-constant status-closed u10)

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-priced-v0-1)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-link-callback-trait-v2.dlc-link-callback-trait)

;; A map of all trusted price-oracles, indexed by their 33 byte compressed public key.
(define-map trusted-oracles (buff 33) bool)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 8))

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

;; A map storing DLC data
(define-map dlcs
  (buff 8)
  {
    uuid: (buff 8),
    ;; closing-time: uint,  ;;seconds because stacks block has the timestamp in seconds
    ;; closing-price: (optional uint),
    actual-closing-time: uint,
    outcome: (optional uint),
    emergency-refund-time: uint,
    creator: principal,
    callback-contract: principal,
    status: uint
  }
)

;; ---------------------------------------------------------
;; Helper functions
;; ---------------------------------------------------------

(define-read-only (get-dlc (uuid (buff 8)))
  (map-get? dlcs uuid)
)

(define-read-only (get-callback-contract (uuid (buff 8)))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (callback-contract (get callback-contract dlc))
    )
    (ok callback-contract)
  )
)

;; @desc indicate that a DLC was funded on Bitcoin
(define-public (set-status-funded (uuid (buff 8)) (callback-contract <cb-trait>))
  (ok (try! (contract-call? callback-contract set-status-funded uuid)))
)

(define-private (shift-value (value uint) (shift uint))
  (* value shift)
)

(define-private (unshift-value (value uint) (shift uint))
  (/ value shift)
)

(define-read-only (get-last-block-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1)))
)

(define-public (set-trusted-oracle (pubkey (buff 33)) (trusted bool))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (ok (map-set trusted-oracles pubkey trusted))
  )
)

(define-read-only (is-trusted-oracle (pubkey (buff 33)))
  (default-to false (map-get? trusted-oracles pubkey))
)

;; ---------------------------------------------------------
;; Main functions
;; ---------------------------------------------------------

(define-public (create-dlc (emergency-refund-time uint) (callback-contract principal) (nonce uint))
  (begin 
    (print {
      emergency-refund-time: emergency-refund-time,
      creator: tx-sender,
      callback-contract: callback-contract,
      nonce: nonce,
      event-source: "dlclink:create-dlc:v0-1" 
    })
    (ok true)
  )
)

(define-public (post-create-dlc (uuid (buff 8)) (emergency-refund-time uint) (creator principal) (callback-contract <cb-trait>) (nonce uint))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-none (map-get? dlcs uuid)) err-dlc-already-added)
    (map-set dlcs uuid {
      uuid: uuid,
      outcome: none,
      actual-closing-time: u0,
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      callback-contract: (contract-of callback-contract),
      status: status-open 
    })
    (print {
      uuid: uuid,
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      event-source: "dlclink:post-create-dlc:v0-1" 
    })
    (try! (contract-call? callback-contract post-create-dlc-handler nonce uuid))
    (nft-mint? open-dlc uuid dlc-manager-contract)
  )
)

;; Closing flow

(define-public (close-dlc (uuid (buff 8)) (outcome uint))
  (let (
      (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq (get creator dlc) tx-sender)) err-unauthorised)
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (asserts! (and (>= outcome u0) (<= outcome u10000)) err-out-of-bounds-outcome)
    (print { 
      uuid: uuid,
      creator: (get creator dlc),
      outcome: outcome,
      caller: tx-sender,
      event-source: "dlclink:close-dlc:v0-1"
    })
    (ok true)
  )
)

(define-public (post-close-dlc (uuid (buff 8)) (callback-contract <cb-trait>) (outcome uint)) 
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (block-timestamp (get-last-block-timestamp))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (map-set dlcs uuid (merge dlc { status: status-closed, outcome: (some outcome), actual-closing-time: (/ block-timestamp u1000) }))
    (print {
      uuid: uuid,
      outcome: outcome,
      actual-closing-time: (/ block-timestamp u1000),
      event-source: "dlclink:post-close-dlc:v0-1" 
    })
    (try! (contract-call? callback-contract post-close-dlc-handler uuid))
    (nft-burn? open-dlc uuid dlc-manager-contract)
  )
)

;; Priced Flow

(define-public (get-btc-price (uuid (buff 8)))
  (let (
      (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq (get creator dlc) tx-sender)) err-unauthorised)
    (print { 
      uuid: uuid,
      creator: (get creator dlc),
      caller: tx-sender,
      event-source: "dlclink:get-btc-price:v0-1"
    })
    (ok true)
  )
)

(define-public (validate-price-data (uuid (buff 8)) (timestamp uint) (entries (list 10 {symbol: (buff 32), value: uint})) (signature (buff 65)) (callback-contract <cb-trait>))
  (let (
    (signer (try! (contract-call? 'STDBEG5X8XD50SPM1JJH0E5CTXGDV5NJTJTTH7YB.redstone-verify recover-signer timestamp entries signature)))
    (block-timestamp (get-last-block-timestamp))
    (price (unwrap! (get value (element-at entries u0)) err-no-price-data))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-trusted-oracle signer) err-untrusted-oracle)
    (asserts! (> timestamp block-timestamp) err-stale-data)
    (print {
      uuid: uuid,
      closing-price: price,
      event-source: "dlclink:validate-price-data:v0-1" 
    })
    (try! (contract-call? callback-contract get-btc-price-callback price uuid))
    (ok true)
  )
)

;; ---------------------------------------------------------
;; Contract Registration
;; ---------------------------------------------------------

;; Admin function to register a protocol/user-contract
;; This is picked up by the Observer infrastructure to start listening to contract-calls of our public functions.
(define-public (register-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (print { 
      contract-address: contract-address,
      event-source: "dlclink:register-contract:v0-1" })
    (nft-mint? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-public (unregister-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (print { 
      contract-address: contract-address,
      event-source: "dlclink:unregister-contract:v0-1" })
    (nft-burn? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-read-only (is-contract-registered (contract-address principal))
  (is-some (nft-get-owner? registered-contract contract-address))
)
