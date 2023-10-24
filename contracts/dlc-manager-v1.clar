
;; dlc-manager-v1

;; Error codes
(define-constant err-unauthorized (err u101))
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
(define-constant err-unknown-attestor (err u113))
(define-constant err-failed-building-uuid (err u114))
(define-constant err-cant-mint-nft (err u115))
(define-constant err-get-attestors (err u116))
(define-constant err-mint-nft (err u117))
(define-constant err-burn-nft (err u118))
(define-constant err-unknown-contract (err u119))
(define-constant err-dlc-in-invalid-state-for-request (err u120))
(define-constant err-not-connected-callback-contract (err u121))

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-v1)

;; Status enums
(define-constant status-created u0)
(define-constant status-funded u1)
(define-constant status-closing u2)
(define-constant status-closed u3)

;; @desc An incrementing id for attestors
(define-data-var attestor-id uint u0)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-link-callback-trait-v1.dlc-link-callback-trait-v1)

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 32))

;; NFT to keep track of registered attestors
;; currently only supports up to 255 attestors
(define-non-fungible-token dlc-attestors uint)

;; A map of all registered attestors,
;; index is an ID uint
;; value is the DNS or IP
(define-map attestors
  uint
  {
    dns: (string-ascii 64)
  }
)

;; A map of all registered attestors by dns
(define-map attestors-by-dns
  (string-ascii 64)
  {
    id: uint
  }
)

;; A map storing DLC data
(define-map dlcs
  (buff 32)
  {
    uuid: (buff 32),
    actual-closing-time: uint,
    outcome: (optional uint),
    creator: principal,
    callback-contract: principal,
    protocol-wallet: principal,
    attestors: (buff 32),
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

;; ---------------------------------------------------------
;; Main functions
;; ---------------------------------------------------------

;; ---------------------------------------------------------
;; Creation flow

;; @desc Initiates the DLC creation flow. See readme for more details.
;; @param callback-contract; the contract-principal where the create-dlc will call back to
(define-public (create-dlc (callback-contract principal) (protocol-wallet principal) (attestor-ids (buff 32)))
  (let (
    (uuid (unwrap! (get-random-uuid (var-get attestor-id)) err-failed-building-uuid))
    (attestor-urls-list (get-url-list-from-buff attestor-ids))
    )
    (asserts! (is-contract-registered contract-caller) err-unknown-contract)
    (asserts! (is-none (map-get? dlcs uuid)) err-dlc-already-added)
    (map-set dlcs uuid {
      uuid: uuid,
      outcome: none,
      actual-closing-time: u0,
      creator: tx-sender,
      callback-contract: callback-contract,
      protocol-wallet: protocol-wallet,
      attestors: attestor-ids,
      status: status-created
    })
    (print {
      uuid: uuid,
      creator: tx-sender,
      callback-contract: callback-contract,
      protocol-wallet: protocol-wallet,
      attestors: attestor-urls-list,
      event-source: "dlclink:create-dlc:v1"
    })
    (unwrap! (nft-mint? open-dlc uuid dlc-manager-contract) err-cant-mint-nft)
    (ok {uuid: uuid, attestors: attestor-urls-list })
  )
)

;; @desc indicate that a DLC was funded on Bitcoin
;; This function is called by the relevant protocol-wallet
(define-public (set-status-funded (uuid (buff 32)) (callback-contract <cb-trait>))
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
        { status: status-funded }
      )
    )
    (print {
      uuid: uuid,
      callback-contract: callback-contract,
      event-source: "dlclink:set-status-funded:v1"
    })
    (ok (try! (contract-call? callback-contract set-status-funded uuid)))
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
        { status: status-closed }
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

;; The idea here is that we would mint an nft with a unique id for each attestor
;; then a JS app would query all the NFTs and choose n at random
;; then call the create-request with that buff of attestor nft ids
(define-public (register-attestor (dns (string-ascii 64)))
  (let (
      (id (var-get attestor-id))
    )
    (asserts! (is-eq contract-owner contract-caller) err-unauthorized)
    (unwrap! (nft-mint? dlc-attestors id dlc-manager-contract) err-mint-nft)
    (map-set attestors id {
      dns: dns,
    })
    (map-set attestors-by-dns dns {
      id: id,
    })
    (var-set attestor-id (+ id u1))
    (ok id)
  )
)

(define-read-only (get-registered-attestor (id uint))
  (begin
    (ok (unwrap! (map-get? attestors id) err-unknown-attestor))
  )
)

(define-read-only (get-registered-attestor-id (dns (string-ascii 64)))
  (begin
    (ok (unwrap-panic (map-get? attestors-by-dns dns)))
  )
)

(define-public (deregister-attestor (id uint))
  (begin
    (asserts! (is-eq contract-owner contract-caller) err-unauthorized)
    (unwrap! (nft-burn? dlc-attestors id dlc-manager-contract) err-burn-nft)
    (map-delete attestors-by-dns (get dns (unwrap-panic (map-get? attestors id))))
    (map-delete attestors id)
    (ok id)
  )
)

(define-public (deregister-attestor-by-dns (dns (string-ascii 64)))
  (begin
    (deregister-attestor (get id (unwrap-panic (get-registered-attestor-id dns))))
  )
)

;; ---------------------------------------------------------
;; Contract Registration
;; ---------------------------------------------------------

;; Admin function to register a protocol/user-contract
;; This is picked up by the Observer infrastructure to start listening to contract-calls of our public functions.
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

;; Take a buff of attestor nft ids and return a list of the attestor urls
;; input: 0x010203 (nfts with ids 1, 2, 3)
;; returns: (list 1.2.3.4 5.6.7.8 1.3.4.5)
(define-private (get-url-list-from-buff (id_buff (buff 32)))
  (begin
    (map get-attestor-url-from-id (map buff-to-uint-be id_buff))
  )
)

(define-private (get-attestor-url-from-id (id uint))
  (begin
      (unwrap-panic (map-get? attestors id))
  )
)

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
