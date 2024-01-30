(impl-trait .dlc-manager-trait-v1-2.dlc-manager-trait-v1-2)
;; dlc-manager-v1

;; Error codes
(define-constant err-unauthorized (err u101))
(define-constant err-dlc-already-added (err u102))
(define-constant err-unknown-dlc (err u103))
(define-constant err-out-of-bounds-outcome (err u110))
(define-constant err-different-outcomes (err u111))
(define-constant err-failed-building-uuid (err u114))
(define-constant err-cant-mint-nft (err u115))
(define-constant err-unknown-contract (err u119))
(define-constant err-dlc-in-invalid-state-for-request (err u120))
(define-constant err-not-connected-callback-contract (err u121))

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-v1-1)

;; Status enums
(define-constant status-created u0)
(define-constant status-funded u1)
(define-constant status-closing u2)
(define-constant status-closed u3)

;; @desc An incrementing nonce for uuid generation
(define-data-var nonce uint u0)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-link-callback-trait-v1-1.dlc-link-callback-trait-v1-1)

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 32))

;; A map storing DLC data
(define-map dlcs
  (buff 32)
  {
    uuid: (buff 32),
    outcome: (optional uint),
    creator: principal,
    callback-contract: principal,
    protocol-wallet: principal,
    value-locked: uint,
    refund-delay: uint,
    status: uint,
    funding-tx-id: (optional (string-ascii 64)),
    closing-tx-id: (optional (string-ascii 64)),
    btc-fee-recipient: (string-ascii 64),
    btc-fee-basis-points: uint
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

;; ---------------------------------------------------------
;; Main functions
;; ---------------------------------------------------------

;; @desc Initiates the DLC creation flow. See readme for more details.
;; @param callback-contract; the contract-principal where the create-dlc will call back to
;; @param protocol-wallet; the principal of the protocol-wallet that will be used for this DLC
;; @param refund-delay  Delay in seconds before the creator can claim a refund. Set 0 to disable.
(define-public (create-dlc (value-locked uint) (callback-contract principal) (protocol-wallet principal) (refund-delay uint) (btc-fee-recipient (string-ascii 64)) (btc-fee-basis-points uint))
  (let (
    (uuid (unwrap! (get-random-uuid (var-get nonce)) err-failed-building-uuid))
    )
    (asserts! (is-contract-registered contract-caller) err-unknown-contract)
    (asserts! (is-none (map-get? dlcs uuid)) err-dlc-already-added)
    (map-set dlcs uuid {
      uuid: uuid,
      outcome: none,
      creator: tx-sender,
      callback-contract: callback-contract,
      protocol-wallet: protocol-wallet,
      value-locked: value-locked,
      refund-delay: refund-delay,
      status: status-created,
      funding-tx-id: none,
      closing-tx-id: none,
      btc-fee-recipient: btc-fee-recipient,
      btc-fee-basis-points: btc-fee-basis-points
    })
    (print {
      uuid: uuid,
      creator: tx-sender,
      callback-contract: callback-contract,
      protocol-wallet: protocol-wallet,
      event-source: "dlclink:create-dlc:v1"
    })
    (unwrap! (nft-mint? open-dlc uuid dlc-manager-contract) err-cant-mint-nft)
    (ok uuid)
  )
)

;; @desc indicate that a DLC was funded on Bitcoin
;; This function is called by the relevant protocol-wallet
(define-public (set-status-funded (uuid (buff 32)) (btc-tx-id (string-ascii 64)) (callback-contract <cb-trait>))
  (let (
      (dlc (unwrap! (map-get? dlcs uuid) err-unknown-dlc))
      (protocol-wallet (get protocol-wallet dlc))
      (status (get status dlc))
      (callback-contract-principal (contract-of callback-contract))
    )
    (asserts! (is-eq protocol-wallet contract-caller) err-unauthorized)
    (asserts! (is-eq (get callback-contract dlc) callback-contract-principal) err-not-connected-callback-contract)
    (asserts! (is-eq status status-created) err-dlc-in-invalid-state-for-request)
    (map-set dlcs uuid
      (merge
        dlc
        { status: status-funded, funding-tx-id: (some btc-tx-id) }
      )
    )
    (print {
      uuid: uuid,
      callback-contract: callback-contract,
      event-source: "dlclink:set-status-funded:v1"
    })
    (ok (try! (contract-call? callback-contract set-status-funded uuid btc-tx-id)))
  )
)

;; @desc close the DLC
(define-public (close-dlc (uuid (buff 32)) (outcome uint))
  (let (
      (dlc (unwrap! (map-get? dlcs uuid) err-unknown-dlc))
      (creator (get creator dlc))
      (callback-contract (get callback-contract dlc))
      (status (get status dlc))
    )
    (asserts! (is-eq callback-contract contract-caller) err-unauthorized)
    (asserts! (or (is-eq status status-created) (is-eq status status-funded)) err-dlc-in-invalid-state-for-request)
    (map-set dlcs uuid
      (merge
        dlc
        { status: status-closing, outcome: (some outcome) }
      )
    )
    (print {
      uuid: uuid,
      outcome: outcome,
      creator: creator,
      event-source: "dlclink:close-dlc:v1"
    })
    (nft-burn? open-dlc uuid dlc-manager-contract)
  )
)

;; @desc indicate that a DLC was closed on Bitcoin
(define-public (post-close (uuid (buff 32)) (btc-tx-id (string-ascii 64)) (callback-contract <cb-trait>))
  (let (
      (dlc (unwrap! (map-get? dlcs uuid) err-unknown-dlc))
      (protocol-wallet (get protocol-wallet dlc))
      (status (get status dlc))
      (callback-contract-principal (contract-of callback-contract))
    )
    (asserts! (is-eq protocol-wallet contract-caller) err-unauthorized)
    (asserts! (is-eq (get callback-contract dlc) callback-contract-principal) err-not-connected-callback-contract)
    (asserts! (is-eq status status-closing) err-dlc-in-invalid-state-for-request)
    (map-set dlcs uuid
      (merge
        dlc
        { status: status-closed, closing-tx-id: (some btc-tx-id) }
      )
    )
    (print {
      uuid: uuid,
      btcTxId: btc-tx-id,
      event-source: "dlclink:post-close-dlc:v1"
    })
    (ok (try! (contract-call? callback-contract post-close-dlc-handler uuid btc-tx-id)))
  )
)

;; ---------------------------------------------------------
;; Contract Registration
;; ---------------------------------------------------------

;; Admin function to register a protocol/user-contract
;; This is picked up by the Attestor infrastructure to start listening to contract-calls of our public functions.
(define-public (register-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner contract-caller) err-unauthorized)
    (print {
      contract-address: contract-address,
      event-source: "dlclink:register-contract:v1" })
    (nft-mint? registered-contract (contract-of contract-address) dlc-manager-contract)
  )
)

(define-public (unregister-contract (contract-address <cb-trait>))
  (begin
    (asserts! (is-eq contract-owner contract-caller) err-unauthorized)
    (print {
      contract-address: contract-address,
      event-source: "dlclink:unregister-contract:v1" })
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
