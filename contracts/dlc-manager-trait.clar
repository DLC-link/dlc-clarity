
(use-trait cb-trait .dlc-link-callback-trait-v1-1.dlc-link-callback-trait-v1-1)
(define-trait dlc-manager-trait-v1-2
    (
        (create-dlc (uint principal principal uint (string-ascii 64) uint) (response (buff 32) uint))
        (set-status-funded ((buff 32) (string-ascii 64) <cb-trait>) (response bool uint))
        (close-dlc ((buff 32) uint) (response bool uint))
        (post-close ((buff 32) (string-ascii 64) <cb-trait>) (response bool uint))
    )
)
