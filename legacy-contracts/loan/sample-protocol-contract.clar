;; sample-contract-loan-v0
;; Sample protocol contract for using DLC.Link.
;; This contract is a sample representing a protocol that would call into the DLC.Link management contract
;; It borrows from the Clarity trait to
;; - Open the dlc
;; - Accept the callback and store the returned UUID
;; - Close the DLC
;; - Accept a succesful closing through the closing callback

(use-trait cb-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-link-callback-trait.dlc-link-callback-trait)
(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-link-callback-trait.dlc-link-callback-trait)

;; Error constants
(define-constant err-cant-unwrap (err u1000))
(define-constant err-contract-call-failed (err u1001))
(define-constant err-unauthorised (err u2001))
(define-constant err-unknown-loan-contract (err u2003))
(define-constant err-doesnt-need-liquidation (err u2004))
(define-constant err-dlc-already-funded (err u2005))

;; Status Enum
(define-constant status-not-ready "not-ready")
(define-constant status-ready "ready")
(define-constant status-funded "funded")
(define-constant status-pre-repaid "pre-repaid")
(define-constant status-repaid "repaid")
(define-constant status-pre-liquidated "pre-liquidated")
(define-constant status-liquidated "liquidated")

;; Contract owner
(define-constant contract-owner tx-sender)

;; Contract name bindings
(define-constant sample-protocol-contract .sample-contract-loan-v0)

;; A map to store "loans": information about a DLC
(define-map loans
  uint ;; The loan-id
  {
    dlc_uuid: (optional (buff 8)),
    ;; Other data about the loan and their specific contract
    status: (string-ascii 14),
    vault-loan: uint, ;; the borrowed amount
    vault-collateral: uint, ;; btc deposit in sats
    liquidation-ratio: uint, ;; the collateral/loan ratio below which liquidation can happen, with two decimals precision (140% = u14000)
    liquidation-fee: uint,  ;; additional fee taken during liquidation, two decimals precision (10% = u1000)
    closing-price: (optional uint),  ;; In case of liquidation, the closing BTC price will be stored here
    owner: principal ;; the stacks account owning this loan
  }
)

(define-map creator-loan-ids principal (list 50 uint))

;; A map to link uuids and loan-ids
;; used to reverse-lookup loan-ids when the dlc-manager contract gives us a UUID
(define-map uuid-loan-id
  (buff 8)
  uint
)

(define-read-only (get-loan (loan-id uint))
  (map-get? loans loan-id)
)

(define-read-only (get-loan-id-by-uuid (uuid (buff 8)))
  (map-get? uuid-loan-id uuid)
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

;; An auto-incrementing loan-id will be used to know which incoming uuid is connected to which loan
(define-data-var last-loan-id uint u0)

(define-read-only (get-last-loan-id)
  (ok (var-get last-loan-id))
)

(define-read-only (get-loan-by-uuid (uuid (buff 8)))
  (let (
    (loan-id (unwrap! (get-loan-id-by-uuid uuid ) err-cant-unwrap ))
    (loan (unwrap! (get-loan loan-id) err-unknown-loan-contract))
    )
    (ok loan)
  )
)

;; An example function to initiate the creation of a DLC loan.
;; - Increments the loan-id
;; - Calls the dlc-manager-contract's create-dlc function to initiate the creation
;; The DLC Contract will call back into the provided 'target' contract with the resulting UUID (and the provided loan-id).
;; Currently this 'target' must be the same contract as the one initiating the process, for authentication purposes.
;; See scripts/setup-loan.ts for an example of calling it.
(define-public (setup-loan (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint))
    (let
      (
        (loan-id (+ (var-get last-loan-id) u1))
        (target sample-protocol-contract)
        (current-loan-ids (get-creator-loan-ids tx-sender))
      )
      (var-set last-loan-id loan-id)
      (begin
          (map-set loans loan-id {
            dlc_uuid: none,
            status: status-not-ready,
            vault-loan: vault-loan-amount,
            vault-collateral: btc-deposit,
            liquidation-ratio: liquidation-ratio,
            liquidation-fee: liquidation-fee,
            closing-price: none,
            owner: tx-sender
          })
          (map-set creator-loan-ids tx-sender (unwrap-panic (as-max-len? (append current-loan-ids loan-id) u50)))
          (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-loan-v0 create-dlc vault-loan-amount btc-deposit liquidation-ratio liquidation-fee emergency-refund-time target loan-id))) err-contract-call-failed)
      )
    )
)


;; Implemented from the trait, this is what is used to pass back the uuid created by the DLC system
;; called by the dlc-manager contract
(define-public (post-create-dlc-handler (loan-id uint) (uuid (buff 8)))
    (begin
      ;; If creation was successful, we save the results in the local maps
        (print { uuid: uuid, loan-id: loan-id, status: status-ready })
        (map-set loans loan-id (
            merge (unwrap! (map-get? loans loan-id) err-unknown-loan-contract ) {
            dlc_uuid: (some uuid),
            status: status-ready
        }))
        (map-set uuid-loan-id uuid loan-id)
        (ok true)
    )
)

;; An example function for closing the loan and initiating the closing of a DLC.
;; Very similar to the creation process
;; See scripts/close-dlc-protocol.ts for an example of calling it.
(define-public (repay-loan (loan-id uint))
  (let (
    (loan (unwrap! (get-loan loan-id) err-unknown-loan-contract))
    (uuid (unwrap! (get dlc_uuid loan) err-cant-unwrap))
    )
    (begin
      (map-set loans loan-id (merge loan { status: status-pre-repaid }))
      (print { uuid: uuid, status: status-pre-repaid })
      (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-loan-v0 close-dlc uuid))) err-contract-call-failed)
    )
  )
)

;; An example function to initiate the liquidation of a DLC loan contract.
(define-public (liquidate-loan (loan-id uint) (btc-price uint))
  (let (
    (loan (unwrap! (get-loan loan-id) err-unknown-loan-contract))
    (uuid (unwrap! (get dlc_uuid loan) err-cant-unwrap))
    )
    (asserts! (unwrap! (check-liquidation uuid btc-price) err-cant-unwrap) err-doesnt-need-liquidation)
    (begin
      (map-set loans loan-id (merge loan { status: status-pre-liquidated }))
      (print { uuid: uuid, status: status-pre-liquidated, btc-price: btc-price })
      (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-loan-v0 close-dlc-liquidate uuid))) err-contract-call-failed)
    )
  )
)

;; A wrapper function around the dlc-manager contract's check-liquidation.
;; Used as a local check before initiating liquidation
(define-private (check-liquidation (uuid (buff 8)) (btc-price uint))
  (let (
    )
    (begin (unwrap! (ok (as-contract (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-loan-v0 check-liquidation uuid btc-price))) err-contract-call-failed)
    )
  )
)

;; Implemented from the trait
;; When this function is called by the dlc-manager contract, we know the closing was successful, so we can finalise changes in this contract.
(define-public (post-close-dlc-handler (uuid (buff 8)) (closing-price (optional uint)))
  (let (
    (loan-id (unwrap! (get-loan-id-by-uuid uuid ) err-cant-unwrap ))
    (loan (unwrap! (get-loan loan-id) err-unknown-loan-contract))
    (currstatus (get status loan) )
    (newstatus  (unwrap! (if (is-eq currstatus status-pre-repaid)
                    (ok status-repaid)
                    (ok status-liquidated)
            ) err-cant-unwrap)
    ))
    (begin
      (map-set loans loan-id (merge loan { status: newstatus, closing-price: closing-price }))
      (print { uuid: uuid, status: newstatus })
    )
    (ok true)
  )
)

(define-public (set-status-funded (uuid (buff 8))) 
  (let (
    (loan-id (unwrap! (get-loan-id-by-uuid uuid ) err-cant-unwrap ))
    (loan (unwrap! (get-loan loan-id) err-unknown-loan-contract))
    )
    (asserts! (not (is-eq (get status loan) status-funded)) err-dlc-already-funded)
    (begin
      (map-set loans loan-id (merge loan { status: status-funded }))
      (print { uuid: uuid, status: status-funded })
    )
    (ok true)
  )
)
