import React, { useState, ReactNode, Children, cloneElement, isValidElement } from "react";

interface TabsProps {
  children: ReactNode;
  defaultIndex?: number;
  className?: string;
}

interface TabProps {
  label: string;
  children: ReactNode;
}

export function Tabs({ children, defaultIndex = 0, className = "" }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const tabs = Children.toArray(children).filter(child => isValidElement(child) && child.type === Tab);

  return (
    <div className={className}>
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab: any, idx) => (
          <button
            key={tab.props.label}
            className={`px-4 py-2 -mb-px font-medium border-b-2 transition-colors focus:outline-none ${
              idx === activeIndex
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300 bg-gray-50"
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
      <div className="bg-white rounded shadow-sm p-4" role="tabpanel" id={`tabpanel-${activeIndex}`}>
        {isValidElement(tabs[activeIndex]) && tabs[activeIndex].props.children}
      </div>
    </div>
  );
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}
