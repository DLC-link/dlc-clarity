import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Button from './button';
import { setupLoan } from './scripts/functions/setup-loan';
import { setOracle } from './scripts/functions/set-oracle'
import { getUUID } from './scripts/functions/get-random-uuid';
import { repay } from './scripts/functions/repay';
import { attemptLiquidate } from './scripts/functions/liquidate-loan';
import { getBalance } from './scripts/functions/get-coin-balance';
import { getCreatorLoans } from './scripts/functions/get-creator-loans';
import { checkLiquidation } from './scripts/functions/check-liquidation';
import { getPayoutRatio } from './scripts/functions/get-payout-ratio';
import { getLastLoanID } from './scripts/functions/get-last-loan-id';
import { registerContract } from './scripts/functions/register-contract';
import { Option } from './scripts/models/network-option.interface';
import Dropdown from './dropdown';
import { borrow } from './scripts/functions/borrow';
import { closeLoan } from './scripts/functions/close-loan';

const networkOptions: Option[] = [
  { value: 'option1', label: 'Mocknet' },
  { value: 'option2', label: 'Mocknet Cloud' },
  { value: 'option3', label: 'Testnet' },
  { value: 'option4', label: 'Mainnet' },
];

const App = () => {

  const fs = [ setOracle, setupLoan, getUUID, borrow, repay, attemptLiquidate, getBalance, getCreatorLoans, checkLiquidation, getPayoutRatio, closeLoan, registerContract ]

  const [loanID, setLoanID] = React.useState(0);

  React.useEffect(() => {
    setLastLoanID();
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newValue = parseInt(event.target.value, 10)
    console.log(newValue)
    setLoanID(newValue);
  }

  async function setLastLoanID() {
    const value = await getLastLoanID.action({});
    setLoanID(parseInt(value.value))
  }

  return (
    <div>
      <h1>Stacks Contracts Scripts</h1>
      <label htmlFor="loanid">Loan ID</label>
      <input id='loanid' type="number" value={loanID} onChange={handleChange} />
      <Button label='Set last loan ID' onClick={setLastLoanID} />
      <Dropdown options={ networkOptions } />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        {fs.map(func => (
          <Button label={func.name} onClick={() => func.action({loanID})} />
        ))}
      </div>
    </div>

  );
};

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
