import React from 'react';
import SalaryDetails from './SalaryDetails';

const sampleData = [
  {
    employee: 'Alice Dupont',
    baseSalary: 2500,
    advance: 800,
    bonus: 300,
    netPay: 2000,
  },
  {
    employee: 'Jean Martin',
    baseSalary: 2200,
    advance: 600,
    bonus: 150,
    netPay: 1750,
  },
  {
    employee: 'Sophie Bernard',
    baseSalary: 2800,
    advance: 1000,
    bonus: 400,
    netPay: 2200,
  },
];

const SalaryDetailsExample: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-3xl">
        <SalaryDetails data={sampleData} />
      </div>
    </div>
  );
};

export default SalaryDetailsExample;
