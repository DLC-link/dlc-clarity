(define-trait dlc-link-callback-trait
    (
        (post-create-dlc-handler (uint (buff 8)) (response bool uint))
        (post-close-dlc-handler ((buff 8) (optional uint)) (response bool uint))
        (set-status-funded ((buff 8)) (response bool uint))
    )
)
