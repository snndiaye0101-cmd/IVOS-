import React from 'react';
interface SelectProps {
  label?: string
  name: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string | number; label: string; disabled?: boolean }[]
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
  icon?: React.ReactNode
}

export default function Select({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  className = '',
  icon
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-10' : 'px-3'} ${!icon ? '' : 'pr-3'} py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors ${
            error ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
