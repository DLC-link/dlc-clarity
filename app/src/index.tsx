import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Button from './button';
import { setupLoan } from './scripts/functions/setup-loan';
import { setOracle } from './scripts/functions/set-oracle'
import { getUUID } from './scripts/functions/get-random-uuid';

const App = () => {

  const fs = [ setOracle, setupLoan, getUUID ]

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
