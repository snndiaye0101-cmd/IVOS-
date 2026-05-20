import React, { useState, ReactNode, Children, cloneElement, isValidElement } from 'react';

interface TabsProps {
  children: ReactNode;
  defaultIndex?: number;
  className?: string;
}

interface TabProps {
  label: string;
  children: ReactNode;
}

export function Tabs({ children, defaultIndex = 0, className = '' }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const tabs = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === Tab
  );

  return (
    <div className={className}>
      <div className="mb-4 flex border-b border-gray-200">
        {tabs.map((tab: any, idx) => (
          <button
            key={tab.props.label}
            className={`-mb-px border-b-2 px-4 py-2 font-medium transition-colors focus:outline-none ${
              idx === activeIndex
                ? 'border-blue-600 bg-white text-blue-700'
                : 'border-transparent bg-gray-50 text-gray-500 hover:border-blue-300 hover:text-blue-600'
            }`}
            onClick={() => setActiveIndex(idx)}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            aria-controls={`tabpanel-${idx}`}
            tabIndex={idx === activeIndex ? 0 : -1}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div
        className="rounded bg-white p-4 shadow-sm"
        role="tabpanel"
        id={`tabpanel-${activeIndex}`}
      >
        {isValidElement(tabs[activeIndex]) && tabs[activeIndex].props.children}
      </div>
    </div>
  );
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}
