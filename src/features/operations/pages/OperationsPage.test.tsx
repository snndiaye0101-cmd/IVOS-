import { render, screen, fireEvent } from '@/test-utils';
import OperationsPage from './OperationsPage';
import { testFixtures } from '../../../__mocks__/fixtures';

describe('OperationsPage', () => {
  beforeEach(() => {
    // Initialiser localStorage avec données mock
    testFixtures.initLocalStorage();
  });

  afterEach(() => {
    // Nettoyer localStorage
    testFixtures.clearLocalStorage();
  });

  it("affiche la page des ordres d'opération", () => {
    render(<OperationsPage />);
    expect(screen.getByText(/Ordres d'Opération/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Rechercher une opération/i)).toBeInTheDocument();
  });

  it('affiche les opérations mockées', () => {
    render(<OperationsPage />);
    expect(screen.getByText(/SN-OPERATION-202603-0001/)).toBeInTheDocument();
    expect(screen.getByText(/SN-OPERATION-202603-0002/)).toBeInTheDocument();
  });
});
