;; Errors
(define-constant ERR_UNAUTHORIZED (err u110001))
(define-constant ERR_DISABLED (err u110002))

;; Variables
(define-data-var contracts-owner principal tx-sender)
(define-data-var contracts-enabled bool true)

;; ---------------------------------------------------------
;; Getters
;; ---------------------------------------------------------

;; @desc get owner of contracts
(define-read-only (get-contracts-owner)
  (var-get contracts-owner)
)

;; @desc get contracts enabled
(define-read-only (get-contracts-enabled)
  (var-get contracts-enabled)
)

;; ---------------------------------------------------------
;; Checks
;; ---------------------------------------------------------

;; @desc check if given sender is contracts owner
;; @param sender; principal to check
;; @post bool; true if given sender is contracts owner
(define-public (check-is-owner (sender principal))
  (begin
    (asserts! (is-eq sender (var-get contracts-owner)) ERR_UNAUTHORIZED)
    (ok true)
  )
)

;; @desc check if contracts are enabled
;; @post bool; true if contracts enabled
(define-public (check-is-enabled)
  (begin
    (asserts! (var-get contracts-enabled) ERR_DISABLED)
    (ok true)
  )
)

;; ---------------------------------------------------------
;; Updates
;; ---------------------------------------------------------

;; @desc set contracts owner
;; @param owner; new contracts owner
;; @post bool; true if successful
(define-public (set-contracts-owner (owner principal))
  (begin
    (try! (check-is-owner tx-sender))
    (var-set contracts-owner owner)
    (ok true)
  )
)

;; @desc enable or disable contracts
;; @param enabled; contracts enabled state
;; @post bool; true if successful
(define-public (set-contracts-enabled (enabled bool))
  (begin
    (try! (check-is-owner tx-sender))
    (var-set contracts-enabled enabled)
    (ok true)
  )
)
