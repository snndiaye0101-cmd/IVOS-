/**
 * Test Utilities - Helpers pour tests React
 * Wrapper avec tous les providers nécessaires
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ContextProvider } from '@/shared/contexts/ContextProvider';
import { AuthProvider } from '@/shared/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Wrapper avec tous les providers
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ContextProvider>
          {children}
        </ContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Custom render avec providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export tout de @testing-library/react
export * from '@testing-library/react';

// Override render avec notre version custom
export { customRender as render };
