import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Button from './button';
import { setupLoan } from './scripts/functions/setup-loan';
import { setOracle } from './scripts/functions/set-oracle'
import { getUUID } from './scripts/functions/get-random-uuid';
import { repayLoan } from './scripts/functions/repay-loan';
import { attemptLiquidate } from './scripts/functions/liquidate-loan';

const App = () => {

  const fs = [ setOracle, setupLoan, getUUID, repayLoan, attemptLiquidate ]

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
