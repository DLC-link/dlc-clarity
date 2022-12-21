;;ERROR CODES
(define-constant err-unauthorised (err u2001))
(define-constant err-dlc-already-added (err u2002))
(define-constant err-unknown-dlc (err u2003))
(define-constant err-not-reached-closing-time (err u2004))
(define-constant err-already-closed (err u2005))
(define-constant err-already-passed-closing-time (err u2006))
(define-constant err-not-closed (err u2007))
(define-constant err-out-of-bounds-outcome (err u2008))

;; status enums
(define-constant status-open u0)
(define-constant status-closed u1)
(define-constant status-early-closed u2)

;; Contract owner
(define-constant contract-owner tx-sender)

;; Current contract's name
(define-constant dlc-manager-contract .dlc-manager-basic-v0-1)

;; Importing the trait to use it as a type
(use-trait cb-trait .dlc-create-callback-trait.dlc-create-callback-trait)

;; NFT to keep track of the open dlcs easily
(define-non-fungible-token open-dlc (buff 8))

;; NFT to keep track of registered contracts
(define-non-fungible-token registered-contract principal)

;; Our map holding the DLCs
(define-map dlcs
	(buff 8)    ;;key
	{           ;;value
    uuid: (buff 8),
    closing-time: uint,
    status: uint,
    actual-closing-time: uint,
    emergency-refund-time: uint,
    creator: principal,
    outcome: (optional uint)
	})

(define-read-only (get-last-block-timestamp)
  (default-to u0 (get-block-info? time (- block-height u1))))

(define-read-only (get-dlc (uuid (buff 8)))
  (map-get? dlcs uuid))

(define-read-only (dlc-status (uuid (buff 8)))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    )
    (ok (get status dlc))
  )
)

;; Emits a print event to notify the dlc.link infrastructure to create a new DLC
(define-public (create-dlc (closing-time uint) (emergency-refund-time uint) (callback-contract principal) (nonce uint))
  (begin 
    (print {
      closing-time: closing-time, 
      emergency-refund-time: emergency-refund-time,
      callback-contract: callback-contract,
      nonce: nonce,
      creator: tx-sender,
      event-source: "dlclink:create-dlc:v0-1" })
    (ok true)))

;; Opens a new dlc - Internal, admin only: called by the DLC Oracle system
(define-public (create-dlc-internal (uuid (buff 8)) (closing-time uint) (emergency-refund-time uint) (creator principal) (callback-contract <cb-trait>) (nonce uint))
  (begin
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)    ;;check if the caller is the owner
    (asserts! (is-none (map-get? dlcs uuid)) err-dlc-already-added) ;;check if DLC is already added or not if yes we throw an err
    (map-set dlcs uuid {       ;;set the new dlc under the uuid in our dlcs map
      uuid: uuid,
      closing-time: closing-time, 
      status: status-open, 
      actual-closing-time: u0, 
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      outcome: none })
    (print {
      uuid: uuid, 
      closing-time: closing-time, 
      emergency-refund-time: emergency-refund-time,
      creator: creator,
      event-source: "dlclink:create-dlc-internal:v0-1"})
    (try! (contract-call? callback-contract post-create-dlc-handler nonce uuid))
    (nft-mint? open-dlc uuid dlc-manager-contract))) ;;mint an open-dlc nft to keep track of open dlcs


;; Normal dlc close
;; outcome is a number between 0-10000 (representing 0-100.00) the value to be signed on the payout-curve
(define-public (close-dlc (uuid (buff 8)) (outcome uint))
  (let 
    (
      (dlc (unwrap! (get-dlc uuid) err-unknown-dlc)) ;;local variable for the dlc asked, throw err if unknown uuid passed
      (block-timestamp (get-last-block-timestamp))   ;;last block timestamp
    )
    (asserts! (>= block-timestamp (get closing-time dlc)) err-not-reached-closing-time) ;;check if block-timestamp passed the closing time specified in the dlc
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)    ;;check if its already closed or not
    (asserts! (or (is-eq contract-owner tx-sender) (is-eq (get creator dlc) tx-sender)) err-unauthorised) ;;check if the caller is the contract owner or the creator
    (asserts! (and (>= outcome u0) (<= outcome u10000)) err-out-of-bounds-outcome)
    (map-set dlcs uuid (merge dlc { status: status-closed, actual-closing-time: block-timestamp, outcome: (some outcome) })) ;;set the status and the actual-closing-time on our dlc
    (print {
      uuid: uuid,
      outcome: outcome,
      event-source: "dlclink:close-dlc:v0-1" })
    (nft-burn? open-dlc uuid dlc-manager-contract))) ;;burn the open-dlc nft related to the UUID

;;early dlc close (very similar to close-dlc) -- admin only
(define-public (early-close-dlc (uuid (buff 8)) (outcome uint))
  (let (
    (dlc (unwrap! (get-dlc uuid) err-unknown-dlc))
    (block-timestamp (get-last-block-timestamp))
    )
    (asserts! (is-eq contract-owner tx-sender) err-unauthorised)
    (asserts! (< block-timestamp (get closing-time dlc)) err-already-passed-closing-time) ;;checl if block-timestamp is smaller than closing time
    (asserts! (is-eq (get status dlc) status-open) err-already-closed)
    (asserts! (and (>= outcome u0) (<= outcome u10000)) err-out-of-bounds-outcome)
    (map-set dlcs uuid (merge dlc { status: status-early-closed, actual-closing-time: block-timestamp, outcome: (some outcome) }))
    (print {
      uuid: uuid,
      outcome: outcome,
      event-source: "dlclink:early-close-dlc:v0-1" })
    (nft-burn? open-dlc uuid dlc-manager-contract))) ;;burn the open-dlc nft related to the UUID

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
