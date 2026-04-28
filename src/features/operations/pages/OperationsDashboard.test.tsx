import { render, screen } from '@/test-utils';
import OperationsDashboard from './OperationsDashboard';
import { testFixtures } from '../../../__mocks__/fixtures';

jest.mock('framer-motion', () => {
  const React = require('react');
  const stripMotionProps = ({
    whileHover,
    whileTap,
    initial,
    animate,
    exit,
    layout,
    transition,
    ...rest
  }: { [key: string]: unknown }) => rest;

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: () => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement('div', stripMotionProps(props), children),
      }
    ),
  };
});

describe('OperationsDashboard', () => {
  beforeEach(() => {
    // Initialiser localStorage avec données mock
    testFixtures.initLocalStorage();
  });

  afterEach(() => {
    // Nettoyer localStorage
    testFixtures.clearLocalStorage();
  });

  it('affiche le tableau de bord avec les colonnes', () => {
    render(<OperationsDashboard />);
    expect(screen.getByText(/Tableau de Bord Opérationnel/i)).toBeInTheDocument();
    expect(screen.getByText(/À planifier/i)).toBeInTheDocument();
    expect(screen.getByText(/En cours/i)).toBeInTheDocument();
    expect(screen.getByText(/Terminé/i)).toBeInTheDocument();
  });

  it('affiche les opérations mockées', () => {
    render(<OperationsDashboard />);
    expect(screen.getByText(/MS-202604-001/)).toBeInTheDocument();
    expect(screen.getByText(/MS-202604-002/)).toBeInTheDocument();
    expect(screen.getByText(/MS-202604-003/)).toBeInTheDocument();
  });
});
