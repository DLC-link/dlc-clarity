(define-trait dlc-link-callback-trait
    (
        (post-close-dlc-handler ((buff 32)) (response bool uint))
        (set-status-funded ((buff 32)) (response bool uint))
    )
)
