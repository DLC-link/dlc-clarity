;; Error codes
(define-constant err-unauthorised (err u101))
(define-constant err-dlc-already-added (err u102))
(define-constant err-unknown-dlc (err u103))
(define-constant err-not-reached-closing-time (err u104))
(define-constant err-already-closed (err u105))
(define-constant err-already-passed-closing-time (err u106))
(define-constant err-not-closed (err u107))
(define-constant err-not-the-same-assets (err u108))
(define-constant err-no-price-data (err u109))
(define-constant err-out-of-bounds-outcome (err u110))
(define-constant err-different-outcomes (err u111))
(define-constant err-stale-data (err u112))
(define-constant err-untrusted-oracle (err u113))

;; Status enums
(define-constant status-open u0)
(define-constant status-closed u1)

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-priced-v0-1)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-link-callback-trait-v2.dlc-link-callback-trait)

;; A map of all trusted price-oracles, indexed by their 33 byte compressed public key.
(define-map trusted-oracles (buff 33) bool)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 32))

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

;; A map storing DLC data
(define-map dlcs
  (buff 32)
  {
    uuid: (buff 32),
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

(define-read-only (get-dlc (uuid (buff 32)))
  (map-get? dlcs uuid)
)

(define-read-only (get-callback-contract (uuid (buff 32)))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (callback-contract (get callback-contract dlc))
    )
    (ok callback-contract)
  )
)

;; @desc indicate that a DLC was funded on Bitcoin
;; Called by the DLC.Link Observer
(define-public (set-status-funded (uuid (buff 32)) (callback-contract <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (print {
      uuid: uuid,
      callback-contract: callback-contract,
      event-source: "dlclink:set-status-funded:v0-1"
    })
    (ok (try! (contract-call? callback-contract set-status-funded uuid)))
  )
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

;; @desc An incrementing nonce used in generating UUIDs
(define-data-var local-nonce uint u0)

;; ---------------------------------------------------------
;; Main functions
;; ---------------------------------------------------------

;; ---------------------------------------------------------
;; Creation flow

;; @desc Initiates the DLC creation flow. See readme for more details.
;; @param emergency-refund-time; the UNIX timestamp [seconds] at which the DLC will be available for refund
;; @param callback-contract; the contract-principal where the post-create-dlc will call back to
;; @param callback-nonce; provided for the dlc by the protocol-contract to connect it to the resulting uuid
(define-public (create-dlc (emergency-refund-time uint) (callback-contract principal) (callback-nonce uint))
  (let (
    (uuid (get-random-uuid (var-get local-nonce)))
    )
    (begin
      (print {
        uuid: uuid,
        emergency-refund-time: emergency-refund-time,
        creator: tx-sender,
        callback-contract: callback-contract,
        nonce: callback-nonce,
        event-source: "dlclink:create-dlc:v0-1"
      })
      (var-set local-nonce (+ (var-get local-nonce) u1))
      (ok true)
    )
  )
)

;; @desc Admin only: Called to finalize DLC Creation
;; Calls back into the callback-contract with the new UUID
(define-public (post-create-dlc (uuid (buff 32)) (emergency-refund-time uint) (creator principal) (callback-contract <cb-trait>) (callback-nonce uint))
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
    (try! (contract-call? callback-contract post-create-dlc-handler callback-nonce uuid))
    (nft-mint? open-dlc uuid dlc-manager-contract)
  )
)

;; ---------------------------------------------------------
;; Closing flow

;; @desc Initiaties closing of a DLC
;; @param uuid; the UUID of the DLC to be closed
;; @param outcome; a value between 0-10000 (0-100.00% representing payout to the two parties)
(define-public (close-dlc (uuid (buff 32)) (outcome uint))
  (let (
      (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq (get callback-contract dlc) tx-sender)) err-unauthorised)
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (asserts! (and (>= outcome u0) (<= outcome u10000)) err-out-of-bounds-outcome)
    (map-set dlcs uuid (merge dlc { outcome: (some outcome) }))
    (print {
      uuid: uuid,
      creator: (get creator dlc),
      callback-contract: (get callback-contract dlc),
      outcome: outcome,
      caller: tx-sender,
      event-source: "dlclink:close-dlc:v0-1"
    })
    (ok true)
  )
)

;; @desc Admin only: Called to finalize DLC Closing
(define-public (post-close-dlc (uuid (buff 32)) (callback-contract <cb-trait>) (oracle-outcome uint))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (block-timestamp (get-last-block-timestamp))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (asserts! (is-eq (some oracle-outcome) (get outcome dlc)) err-different-outcomes)
    (map-set dlcs uuid (merge dlc { status: status-closed, outcome: (some oracle-outcome), actual-closing-time: (/ block-timestamp u1000) }))
    (print {
      uuid: uuid,
      outcome: oracle-outcome,
      actual-closing-time: (/ block-timestamp u1000),
      event-source: "dlclink:post-close-dlc:v0-1"
    })
    (try! (contract-call? callback-contract post-close-dlc-handler uuid))
    (nft-burn? open-dlc uuid dlc-manager-contract)
  )
)

;; ---------------------------------------------------------
;; Priced Flow

;; @desc Initiates a priced DLC closing
(define-public (get-btc-price (uuid (buff 32)))
  (let (
      (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
      (creator (get creator dlc))
      (callback-contract (get callback-contract dlc))
    )
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq callback-contract tx-sender)) err-unauthorised)
    (print {
      uuid: uuid,
      creator: creator,
      callback-contract: callback-contract,
      caller: tx-sender,
      event-source: "dlclink:get-btc-price:v0-1"
    })
    (ok true)
  )
)

;; @desc DLC on-chain validation of BTC price data.
;; Calls the get-btc-price-callback of the protocol-contract.
(define-public (validate-price-data (uuid (buff 32)) (timestamp uint) (entries (list 10 {symbol: (buff 32), value: uint})) (signature (buff 65)) (callback-contract <cb-trait>))
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
      price: price,
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

;; ---------------------------------------------------------
;; Utilities
;; ---------------------------------------------------------

(define-constant byte-list 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff)

(define-private (uint-to-buff-iter (b (buff 1)) (p {n: uint, a: (buff 32)}))
  {
    a: (unwrap-panic (as-max-len? (concat (if (is-eq (get n p) u0) 0x00 (unwrap-panic (element-at byte-list (mod (get n p) u256)))) (get a p)) u32)),
    n: (/ (get n p) u256)
  }
)

(define-read-only (uint256-to-buff-be (n uint))
  (unwrap-panic (as-max-len? (get a (fold uint-to-buff-iter 0x0000000000000000000000000000000000000000000000000000000000000000 {n: n, a: 0x})) u32))
)

;; Returns a random (buff 32)
(define-read-only (get-random-uuid (n uint))
  (ok (keccak256 (concat (uint256-to-buff-be n) (unwrap-panic (get-block-info? vrf-seed (- block-height u1))))))
)
