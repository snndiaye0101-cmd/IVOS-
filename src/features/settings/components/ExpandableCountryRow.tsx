import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ICountry } from '../../../shared/services/countryStore';

interface ExpandableCountryRowProps {
  country: ICountry;
  expanded: boolean;
  onExpand: () => void;
  siteCount: number;
  children?: React.ReactNode;
}

export const ExpandableCountryRow: React.FC<ExpandableCountryRowProps> = ({
  country,
  expanded,
  onExpand,
  siteCount,
  children,
}) => {
  return (
    <>
      <tr
        className={`group cursor-pointer transition-colors hover:bg-gray-50/50 ${expanded ? 'bg-indigo-50/40' : ''}`}
        onClick={onExpand}
        tabIndex={0}
        aria-expanded={expanded}
      >
        <td className="px-5 py-3.5 font-medium text-gray-900">
          <span className="mr-2">{country.flagEmoji}</span>
          {country.name}
        </td>
        <td className="px-5 py-3.5 font-mono text-gray-600">{country.codeIso}</td>
        <td className="px-5 py-3.5 font-mono text-gray-600">{country.currencyCode}</td>
        <td className="px-5 py-3.5 text-gray-600">{country.currencySymbol}</td>
        <td className="px-5 py-3.5">
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {siteCount}
          </span>
        </td>
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {/* Actions (Edit/Delete) injected by parent */}
            <ChevronDown
              className={`ml-2 h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:text-indigo-600 ${expanded ? 'rotate-180' : ''}`}
              aria-label="Afficher les détails"
            />
          </div>
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {expanded && (
          <tr>
            <td colSpan={6} className="bg-indigo-50/30 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {children}
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
};
