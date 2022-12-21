
;; sample-contract-priced
;; Sample protocol contract for using DLC.Link.
;; This contract is a sample representing a protocol that would call into the DLC.Link management contract
;; It borrows from the Clarity trait to
;; - Open the dlc
;; - Accept the callback and store the returned UUID
;; - Close the DLC

(use-trait cb-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-create-callback-trait.dlc-create-callback-trait)
(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-create-callback-trait.dlc-create-callback-trait)

;; Error constants
(define-constant err-cant-unwrap (err u1000))
(define-constant err-unauthorised (err u2001))
(define-constant err-unknown-user-contract (err u2003))

;; Contract owner
(define-constant contract-owner tx-sender)

;; Contract name bindings
(define-constant sample-protocol-contract .sample-contract-priced-v0)

;; A map to store "usercontracts": information about a DLC
(define-map usercontracts
  uint
  {
    dlc_uuid: (optional (buff 8)),
    nonce: uint,
    ;; Other data about the user and their specific contract
    active: bool
  }
)

(define-read-only (get-usercontract (nonce uint)) 
  (map-get? usercontracts nonce)
)

;; An auto-incrementing nonce will be used to know which incoming uuid is connected to which usercontract
(define-data-var last-nonce uint u0)

(define-read-only (get-last-nonce) 
  (ok (var-get last-nonce))
)

;; implemented from the trait, this is what is used to pass back the uuid created by the DLC system
(define-public (post-create-dlc-handler (nonce uint) (uuid (buff 8)))
    (begin
        (print { uuid: uuid, nonce: nonce })
        (map-set usercontracts nonce (
            merge (unwrap! (map-get? usercontracts nonce) err-unknown-user-contract ) {
            dlc_uuid: (some uuid),
            nonce: nonce,
            active: true
        }))
        (ok true)
    )
)

;; An example function to initiate the creation of a DLC usercontract.
;; - Increments the nonce
;; - Adds the data to the local map
;; - Calls the dlc-manager-contract's create-dlc function to initiate the creation
;; The DLC Contract will call back into the provided 'target' contract with the resulting UUID (and the provided nonce).
;; Currently this 'target' must be the same contract as the one initiating the process, for authentication purposes.
;; See scripts/setup-user-contract.ts for an example of calling it.
(define-public (setup-user-contract (asset (buff 32)) (strike-price uint) (closing-time uint) (emergency-refund-time uint))
    (let 
      ((nonce (+ (var-get last-nonce) u1)) (target sample-protocol-contract))
      (var-set last-nonce nonce)
      (begin
          (map-set usercontracts nonce {
            dlc_uuid: none,
            nonce: nonce,
            active: false
          })
          (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0 create-dlc asset strike-price closing-time emergency-refund-time target nonce))) err-cant-unwrap)
      )
    )
)

;; An example function for initiating the closing of a DLC.
;; Very similar to the creation process
;; See scripts/close-dlc-protocol.ts for an example of calling it.
(define-public (close-dlc (nonce uint)) 
  (let (
    (usercontract (unwrap! (get-usercontract nonce) err-unknown-user-contract))
    (uuid (unwrap! (get dlc_uuid usercontract) err-cant-unwrap))
    )
    (asserts! (is-eq contract-owner tx-sender)  err-unauthorised)
    (begin 
      (map-set usercontracts nonce (merge usercontract { active: false }))
      (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0 close-dlc uuid))) err-cant-unwrap)
    )
  )
)
