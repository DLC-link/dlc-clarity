(define-constant err-cant-unwrap (err u1000))

(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-link-callback-trait-v2.dlc-link-callback-trait)

(define-public (post-create-dlc-handler (nonce uint) (uuid (buff 32)))
    (begin
        (print { uuid: uuid, nonce: nonce, event-source: "callback-mock-post-create" })
        (ok true)
    )
)

(define-public (post-close-dlc-handler (uuid (buff 32)))
    (begin
        (print { uuid: uuid, event-source: "callback-mock-post-close" })
        (ok true)
    )
)

(define-public (create-dlc-request (vault-loan-amount uint) (btc-deposit uint) (liquidation-ratio uint) (liquidation-fee uint) (emergency-refund-time uint))
  (let ((target .callback-contract))
    (unwrap! (ok (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dlc-manager-priced-v0-1 create-dlc emergency-refund-time target u1)) err-cant-unwrap)
  )
)

(define-public (set-status-funded (uuid (buff 32)))
  (begin
    (print { uuid: uuid, event-source: "callback-set-status-funded" })
    (ok true)
  )
)

(define-public (get-btc-price-callback (price uint) (uuid (buff 32)))
  (begin
    (print { price: price, uuid: uuid, event-source: "callback-mock-btc-price" })
    (ok true)
  )
)
