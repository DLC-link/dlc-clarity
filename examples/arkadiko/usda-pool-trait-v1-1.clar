(define-trait usda-pool-trait
  (
    (get-pool-balances () (response (tuple (staked uint) (available uint) (used uint)) uint))
    (deposit (uint) (response uint uint))
    (withdraw (uint principal) (response uint uint))
  )
)
