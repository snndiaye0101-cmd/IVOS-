import { useState } from 'react';
import { Archive, RefreshCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useContextSelector } from '../../../shared/contexts/ContextProvider';

interface AnnualClosurePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onArchive: (year: number, siteCode: string) => Promise<void>;
  onReset: (year: number, siteCode: string) => Promise<void>;
}

export default function AnnualClosurePanel({
  isOpen,
  onClose,
  onArchive,
  onReset,
}: AnnualClosurePanelProps) {
  const { site, year } = useContextSelector();
  const [loading, setLoading] = useState<'archive' | 'reset' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!site || !year) return null;

  const handleArchive = async () => {
    setLoading('archive');
    setError(null);
    try {
      await onArchive(year, site.code);
      setSuccess('Archivage annuel terminé avec succès.');
    } catch (e) {
      setError('Erreur lors de l’archivage.');
    }
    setLoading(null);
  };

  const handleReset = async () => {
    setLoading('reset');
    setError(null);
    try {
      await onReset(year, site.code);
      setSuccess('Réinitialisation annuelle effectuée.');
    } catch (e) {
      setError('Erreur lors de la réinitialisation.');
    }
    setLoading(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Clôture annuelle – ${site.name} (${year})`}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
          <Archive className="text-blue-700" />
          <span className="font-semibold text-blue-900">
            Vous pouvez archiver toutes les données de l’année sélectionnée pour ce site. Cette
            opération est irréversible.
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
          <RefreshCcw className="text-yellow-700" />
          <span className="font-semibold text-yellow-900">
            Vous pouvez réinitialiser les compteurs et états pour la nouvelle année. Les archives ne
            seront pas supprimées.
          </span>
        </div>
        {success && (
          <div className="flex items-center gap-2 font-bold text-green-700">
            <CheckCircle2 /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 font-bold text-red-700">
            <AlertTriangle /> {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="danger" onClick={handleArchive} disabled={loading === 'archive'}>
            {loading === 'archive' ? 'Archivage...' : 'Archiver l’année'}
          </Button>
          <Button variant="primary" onClick={handleReset} disabled={loading === 'reset'}>
            {loading === 'reset' ? 'Réinitialisation...' : 'Réinitialiser'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
