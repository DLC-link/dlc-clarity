(define-constant err-cant-unwrap (err u1000))

(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-link-callback-trait-v1-1.dlc-link-callback-trait-v1-1)

(define-public (post-close-dlc-handler (uuid (buff 32)) (btc-tx-id (string-ascii 64)))
    (begin
        (print { uuid: uuid, event-source: "callback-mock-post-close", btc-tx-id: btc-tx-id })
        (ok true)
    )
)

(define-public (create-dlc-request (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint))
  (let ((target .callback-contract-v1-1))
    (unwrap! (ok (contract-call?  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-v1-1 create-dlc btc-deposit target 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP emergency-refund-time "0x" u0)) err-cant-unwrap)
  )
)

(define-public (set-status-funded (uuid (buff 32)) (btc-tx-id (string-ascii 64)))
  (begin
    (print { uuid: uuid, event-source: "callback-set-status-funded" })
    (ok true)
  )
)

(define-public (close-dlc-request (uuid (buff 32)) (outcome uint))
  (begin
    (unwrap! (ok (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-v1-1 close-dlc uuid outcome )) err-cant-unwrap)
  )
)
