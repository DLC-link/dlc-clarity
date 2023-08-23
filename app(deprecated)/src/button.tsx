import * as React from 'react';

type ButtonProps = {
  label: string;
  onClick: () => void;
};

const Button = ({ label, onClick }: ButtonProps) => {
  return <button
    onClick={onClick}
    style={{
      backgroundColor: 'transparent',
      color: '#0066CC',
      border: '2px solid #e7e7e7',
      borderRadius: '8px',
      padding: '10px 20px',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'inline-block',
      fontSize: '16px',
      cursor: 'pointer',
    }}
    >{label}</button>;
};

export default Button;
