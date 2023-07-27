(define-trait dlc-link-callback-trait-v1
    (
        (post-close-dlc-handler ((buff 32) (string-ascii 64)) (response bool uint))
        (set-status-funded ((buff 32)) (response bool uint))
    )
)
