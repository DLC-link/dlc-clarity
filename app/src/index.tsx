import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Button from './button';
import { setupLoan } from './scripts/functions/setup-loan';
import { setOracle } from './scripts/functions/set-oracle'
import { getUUID } from './scripts/functions/get-random-uuid';
import { repayLoan } from './scripts/functions/repay-loan';
import { attemptLiquidate } from './scripts/functions/liquidate-loan';
import { getBalance } from './scripts/functions/get-coin-balance';
import { getCreatorLoans } from './scripts/functions/get-creator-loans';
import { checkLiquidation } from './scripts/functions/check-liquidation';
import { getPayoutRatio } from './scripts/functions/get-payout-ratio';

const App = () => {

  const fs = [ setOracle, setupLoan, getUUID, repayLoan, attemptLiquidate, getBalance, getCreatorLoans, checkLiquidation, getPayoutRatio ]

  return (
    <div>
      <h1>Stacks Contracts Scripts</h1>
      {fs.map(func => (
        <Button label={func.name} onClick={func.action} />
      ))}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
