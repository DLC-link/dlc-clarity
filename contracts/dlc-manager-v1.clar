
;; title: dlc-manager-v1
;; version:
;; summary:
;; description:

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
(define-constant err-unknown-attestor (err u113))
(define-constant err-failed-building-uuid (err u114))
(define-constant err-cant-mint-nft (err u115))
(define-constant err-get-attestors (err u116))
(define-constant err-mint-nft (err u117))
(define-constant err-burn-nft (err u118))

;; traits
;;

;; token definitions
;;

;; constants
;;

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-v1)

;; Status enums
(define-constant status-created u0)
(define-constant status-funded u1)
(define-constant status-closing u2)
(define-constant status-closed u3)

;; data vars
;;

;; @desc An incrementing id for attestors
(define-data-var attestor-id uint u0)

;; data maps
;;

;; public functions
;;

;; read only functions
;;

;; private functions
;;


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
    dns: (string-ascii 32)
  }
)

(define-map whitelisted-contracts
  principal
  {
    status: bool
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


;; The idea here is that we would mint an nft with a unique id for each attestor
;; then a JS app would query all the NFTs and choose n at random
;; and hand into the createDLC function all those ids mashed together in a buff
;; and we would parse it in contract, make sure they're all valid NFTs, and then
;; print the corresponding DNS values into the createDLC create function
(define-public (register-attestor (dns (string-ascii 32)))
  (let (
      (id (var-get attestor-id))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (unwrap! (nft-mint? dlc-attestors id dlc-manager-contract) err-mint-nft)
    (map-set attestors id {
      dns: dns,
    })
    (var-set attestor-id (+ id u1))
    (ok id)
  )
)

(define-public (get-registered-attestor (id uint))
  (begin
    (ok (unwrap! (map-get? attestors id) err-unknown-attestor))
  )
)

(define-public (deregister-attestor (id uint))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (unwrap! (nft-burn? dlc-attestors id dlc-manager-contract) err-burn-nft)
    (map-delete attestors id)
    (ok id)
  )
)

(define-public (whitelist-contract (contract-address principal))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (map-set whitelisted-contracts contract-address {
      status: true,
    })
    (ok true)
  )
)

(define-public (de-whitelist-contract (contract-address principal))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (map-delete whitelisted-contracts contract-address)
    (ok true)
  )
)

(define-public (is-contract-whitelisted (contract-address principal))
  (begin
    (if (is-eq (map-get? whitelisted-contracts contract-address) none)
      (ok false)
      (ok true)
    )
  )
)

;; get the URIs from the map of attestors

;; ---------------------------------------------------------
;; Utilities
;; ---------------------------------------------------------

;; Pass in a buff of nft ids which map to the attestor nfts, and we'll return a list of the ids as uints
;; input format is like 0x01020304 -> (list 1 2 3 4)
;; (define-private (get-int-list-from-buff (id_buff (buff 32)))
;;   (begin
;;     (ok (map buff-to-int-be id_buff))
;;   )
;; )

;; Take a buff of attestor nft ids and return a list of the attestor urls
;; input: 0x010203 (nfts with ids 1, 2, 3)
;; returns: (list 1.2.3.4 5.6.7.8 1.3.4.5)
(define-private (get-url-list-from-buff (id_buff (buff 32)))
  (begin
    (map get-attestor-url-from-id (map buff-to-uint-be id_buff))
  )
)

;; (define-private (get-attestor-urls-from-ids-list (list ids))
;;   (begin
;;     (ok (map get-attestor-url-from-id ids))
;;   )
;; )

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
