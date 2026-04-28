import React from 'react';
import { QrCode, ShieldCheck } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

// Props attendus : agent, logoUrl, drapeauUrl, watermarkUrl, etc.
export default function BadgeRectoVerso({
  agent,
  logoUrl = '/logo-ivos.jpg',
  qrUrl = '',
  bandColor = '#1652C9',
  legalPhone = '+221 33 000 00 00',
  legalAddress = 'Kignabour, Sénégal',
  face = 'recto',
}: {
  agent: {
    firstName: string;
    lastName: string;
    poste: string;
    photo?: string;
    matricule: string;
    bloodGroup?: string;
    issueDate?: string;
    expiryDate?: string;
  };
  qrUrl: string;
  bandColor?: string;
  legalPhone?: string;
  legalAddress?: string;
  face?: 'recto' | 'verso';
  logoUrl?: string;
}) {
  const CARD_W = 330;
  const CARD_H = 520;
  const fullName = `${agent.firstName} ${agent.lastName}`;
  const initials = `${agent.firstName[0] || ''}${agent.lastName[0] || ''}`.toUpperCase();
  const legalNotice = `Carte strictement personnelle, propriété de IVOS et peut être retirée à tout moment. Toute personne trouvant cette carte est priée de bien vouloir contacter le numéro de téléphone suivant : ${legalPhone} et à l'adresse : ${legalAddress}.`;

  if (face === 'recto') {
    return (
      <div
        className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-lg"
        style={{ width: CARD_W, height: CARD_H }}
      >
        <div className="absolute inset-x-0 top-0 h-14" style={{ background: `linear-gradient(180deg, ${bandColor} 0%, #0F172A 100%)` }} />
        <div className="relative flex h-full flex-col px-3 pb-3 pt-2">
          <div className="flex items-center justify-between rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm">
            <img src={logoUrl} alt="IVOS Logo" className="h-9 w-auto object-contain" />
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Badge IVOS</p>
              <p className="text-[11px] font-semibold text-slate-700">Accès sécurisé</p>
            </div>
          </div>

          <div className="mt-1.5 flex flex-col items-center justify-start">
            <div className="rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="h-[214px] w-[214px] rounded-lg object-contain" />
              ) : agent.matricule ? (
                <QRCodeCanvas
                  key={agent.matricule}
                  value={agent.matricule}
                  size={214}
                  bgColor="#ffffff"
                  fgColor="#0F172A"
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="flex h-[214px] w-[214px] items-center justify-center rounded-lg bg-slate-100">
                  <QrCode size={72} className="text-slate-300" />
                </div>
              )}
            </div>
            <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">QR géant portail</p>
          </div>

          <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2.5 font-sans">
            <div className="relative shrink-0">
              {agent.photo ? (
                <img src={agent.photo} alt="Photo" className="h-[72px] w-[72px] rounded-xl border-2 border-white object-cover shadow-md" />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border-2 border-white bg-slate-200 text-xl font-black text-slate-500 shadow-md">
                  {initials}
                </div>
              )}
              <div className="absolute -right-2 -top-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-red-950 bg-red-600 px-1.5 shadow-md ring-2 ring-white">
                <span className="text-[13px] font-black leading-none text-white">{agent.bloodGroup || '--'}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-0.5 text-slate-800">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Collaborateur</p>
              <h2 className="mt-0.5 truncate text-[19px] font-black leading-tight text-slate-900">{fullName}</h2>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-blue-700">{agent.poste}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{agent.matricule}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Statut</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Autorisation active</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Valide</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-lg"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="relative flex h-full flex-col items-center px-4 pb-5 pt-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm">
          <img src={logoUrl} alt="IVOS Logo" className="mx-auto h-28 w-auto object-contain" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <img src={logoUrl} alt="" aria-hidden="true" className="h-[290px] w-auto object-contain" />
        </div>

        <div className="relative mt-6 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm">
          <p className="text-center text-[11.5px] leading-[1.65] font-semibold text-slate-700">
            {legalNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
