import React, { useState, useRef } from 'react';
import { generateQRDataUrl } from '../services/badgeService';
import html2canvas from 'html2canvas';
import Button from '../../../components/ui/Button';

interface BadgeDesignerProps {
  agent: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    poste: string;
    photo?: string;
  } | null;
  logoUrl: string;
}

const BADGE_WIDTH = 340;
const BADGE_HEIGHT = 210;

export default function BadgeDesigner({ agent, logoUrl }: BadgeDesignerProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const badgeRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!agent) return;
    const url = await generateQRDataUrl(agent as unknown as Parameters<typeof generateQRDataUrl>[0]);
    setQrUrl(url);
  };

  const handleDownload = async () => {
    if (!badgeRef.current) return;
    const canvas = await html2canvas(badgeRef.current, { scale: 3 });
    const link = document.createElement('a');
    link.download = `badge_${agent?.matricule || 'IVOS'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div
        ref={badgeRef}
        className="relative bg-white rounded-xl shadow-lg border border-gray-200"
        style={{ width: BADGE_WIDTH, height: BADGE_HEIGHT, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #1a1a2e 60%, #fff 100%)' }}
      >
        {/* Logo */}
        <img src={logoUrl} alt="IVOS Logo" style={{ width: 60, position: 'absolute', top: 16, left: 16 }} />
        {/* Photo */}
        {agent?.photo ? (
          <img src={agent.photo} alt="Photo" className="absolute right-6 top-6 w-16 h-16 rounded-full object-cover border-4 border-white shadow" />
        ) : (
          <div className="absolute right-6 top-6 w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold text-white border-4 border-white shadow">
            {agent ? `${agent.firstName[0]}${agent.lastName[0]}`.toUpperCase() : ''}
          </div>
        )}
        {/* Infos */}
        <div className="absolute left-6 bottom-20 text-white">
          <div className="text-lg font-bold">{agent?.firstName} {agent?.lastName}</div>
          <div className="text-xs font-semibold opacity-80">{agent?.poste}</div>
          <div className="text-xs font-mono opacity-70">{agent?.matricule}</div>
        </div>
        {/* QR Code */}
        {qrUrl && (
          <img src={qrUrl} alt="QR Code" className="absolute right-6 bottom-6 w-16 h-16 bg-white p-1 rounded" />
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={handleGenerate} disabled={!agent}>
          🪪 Générer le Badge
        </Button>
        <Button onClick={handleDownload} disabled={!agent || !qrUrl}>
          📥 Télécharger le Badge
        </Button>
      </div>
    </div>
  );
}
