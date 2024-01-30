(define-trait dlc-link-callback-trait-v1-1
    (
        (set-status-funded ((buff 32) (string-ascii 64)) (response bool uint))
        (post-close-dlc-handler ((buff 32) (string-ascii 64)) (response bool uint))
    )
)
