import React, { useState } from 'react';
import { Option } from './scripts/models/network-option.interface';

function Dropdown({ options }: { options: Option[] }) {
  const [selectedOption, setSelectedOption] = useState<Option>();

  const handleOptionChange = (changeEvent: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(options.find(op => op.value == changeEvent.target.value));
  };

  return (
    <select value={selectedOption?.value} onChange={handleOptionChange}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default Dropdown;
