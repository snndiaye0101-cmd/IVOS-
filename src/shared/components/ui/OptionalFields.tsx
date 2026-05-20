import React, { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface OptionalFieldsProps {
  label?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function OptionalFields({
  label = 'Plus de détails',
  children,
  defaultOpen = false,
}: OptionalFieldsProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-4 border-t border-dashed border-gray-200 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 py-1 text-sm font-medium text-gray-500 transition-colors hover:text-[#1652C9]"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {label}
      </button>
      {open && <div className="mt-3 animate-fadeIn">{children}</div>}
    </div>
  );
}
