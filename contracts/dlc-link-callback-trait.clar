(define-trait dlc-link-callback-trait
    (
        (post-create-dlc-handler (uint (buff 32)) (response bool uint))
        (post-close-dlc-handler ((buff 32)) (response bool uint))
        (get-btc-price-callback (uint (buff 32)) (response bool uint))
        (set-status-funded ((buff 32)) (response bool uint))
    )
)
