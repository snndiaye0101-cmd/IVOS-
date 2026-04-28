import React, { useState, useEffect } from 'react';
import { personnelStore, PersonnelAgent } from '../../fleet/services/personnelStore';
import { generateQRDataUrl } from '../services/badgeService';
import BadgeRectoVerso from './BadgeRectoVerso';
import html2canvas from 'html2canvas';
import { Paintbrush, QrCode, Printer, ChevronDown, Loader2, CreditCard } from 'lucide-react';
import { loadBaseConfig } from '../../settings/services/baseConfigStore';

const BADGE_BRAND = {
  primary: '#1652C9',
  secondary: '#0F172A',
  accent: '#0EA5E9',
};

const BadgeConception = () => {
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<PersonnelAgent | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [loadingQR, setLoadingQR] = useState(false);
  const [baseConfig, setBaseConfig] = useState(() => loadBaseConfig());

  useEffect(() => {
    setAgents(personnelStore.load());
    setBaseConfig(loadBaseConfig());
  }, []);

  useEffect(() => {
    setSelectedAgent(agents.find(a => a.id === selectedId) || null);
    setQrUrl('');
  }, [selectedId, agents]);

  useEffect(() => {
    let cancelled = false;
    const loadQr = async () => {
      if (!selectedAgent) { setQrUrl(''); return; }
      setLoadingQR(true);
      const url = await generateQRDataUrl(selectedAgent);
      if (!cancelled) { setQrUrl(url); setLoadingQR(false); }
    };
    loadQr();
    return () => { cancelled = true; };
  }, [selectedAgent]);

  const agentData = selectedAgent ? {
    firstName: selectedAgent.firstName,
    lastName: selectedAgent.lastName,
    poste: selectedAgent.poste,
    photo: selectedAgent.photo,
    matricule: selectedAgent.matricule,
    bloodGroup: selectedAgent.bloodGroup,
    issueDate: selectedAgent.hireDate,
    expiryDate: '',
  } : null;

  const handlePrint = async () => {
    const exportZone = document.getElementById('badge-pdf-export');
    if (!exportZone) return;
    const canvas = await html2canvas(exportZone, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const win = window.open('');
    if (win) {
      win.document.write(`<!DOCTYPE html>
<html><head><title>Badges IVOS — ${selectedAgent?.firstName} ${selectedAgent?.lastName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
  .header { width:100%; padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:12px; }
  .header img { height:40px; }
  .header h1 { font-size:16px; font-weight:700; color:#1e293b; }
  .preview { display:flex; gap:40px; align-items:center; justify-content:center; padding:40px; }
  img.badge { border-radius:24px; box-shadow:0 8px 32px rgba(0,0,0,.15); }
  @media print { .header { display:none; } .preview { padding:20px; } }
</style></head>
<body>
  <div class="header">
    <img src="/logo-ivos.jpg" alt="IVOS" />
    <h1>Badge — ${selectedAgent?.firstName} ${selectedAgent?.lastName} · ${selectedAgent?.poste}</h1>
  </div>
  <div class="preview">
    <img class="badge" src="${imgData}" style="max-width:700px;width:100%;"/>
  </div>
</body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col">

      {/* ── Barre de titre ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BADGE_BRAND.primary }}>
          <CreditCard size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Conception de Badges Sécurisés</h1>
          <p className="text-xs text-slate-500 mt-0.5">Prévisualisation recto / verso · Charte graphique IVOS unifiée</p>
        </div>
      </div>

      {/* ── Corps principal : panneau gauche + zone de prévisualisation ── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

        {/* Panneau de configuration */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col gap-0 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Paintbrush size={14} /> Paramètres
            </h2>

            {/* Sélection collaborateur */}
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Collaborateur</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Choisir un collaborateur…</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.poste}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Statut QR */}
            <div className={`mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${loadingQR ? 'bg-amber-50 text-amber-700' : selectedAgent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
              {loadingQR
                ? <><Loader2 size={15} className="animate-spin" /><span>Génération du QR sécurisé…</span></>
                : selectedAgent
                  ? <><QrCode size={15} /><span>QR HMAC signé · prêt</span></>
                  : <><QrCode size={15} /><span>En attente de sélection</span></>
              }
            </div>
          </div>

          {/* Charte graphique */}
          <div className="p-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Charte graphique</p>
            <div className="flex items-center gap-3 mb-3">
              {[BADGE_BRAND.primary, BADGE_BRAND.secondary, BADGE_BRAND.accent].map(c => (
                <span key={c} className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ background: c }} title={c} />
              ))}
              <span className="text-xs font-semibold text-slate-600">IVOS Blue System</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">Format portrait · Logo en tête · QR central · Mentions légales dynamiques au verso.</p>
          </div>

          {/* Données légales (info) */}
          <div className="p-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Données verso (Configuration de base)</p>
            <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-800 space-y-1">
              <div><span className="font-semibold">Tél. :</span> {baseConfig.phone || '—'}</div>
              <div><span className="font-semibold">Adresse :</span> {baseConfig.address || '—'}</div>
            </div>
          </div>

          {/* Bouton impression */}
          <div className="p-6 mt-auto">
            <button
              onClick={handlePrint}
              disabled={!selectedAgent || loadingQR}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${BADGE_BRAND.primary} 0%, ${BADGE_BRAND.accent} 100%)` }}
            >
              <Printer size={16} />
              Imprimer / Télécharger PDF
            </button>
            {!selectedAgent && (
              <p className="mt-2 text-center text-xs text-slate-400">Sélectionnez un collaborateur d'abord</p>
            )}
          </div>
        </div>

        {/* ── Zone de prévisualisation ── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1f2e] relative overflow-auto py-12 px-4 lg:px-8">

          {/* Watermark de fond */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none">
            <span className="text-white text-[160px] font-black tracking-[0.3em] rotate-[-20deg]">IVOS</span>
          </div>

          {!selectedAgent || !agentData ? (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10">
                <CreditCard size={48} className="text-white/40" />
              </div>
              <div>
                <p className="text-lg font-bold text-white/60">Aucun badge à prévisualiser</p>
                <p className="mt-1 text-sm text-white/30">Sélectionnez un collaborateur dans le panneau de gauche</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-10 w-full">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Aperçu avant impression</p>

              <div
                id="badge-pdf-export"
                className="flex flex-col sm:flex-row gap-10 sm:gap-12 items-center justify-center"
              >
                {/* RECTO */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Recto — Face avant</span>
                  </div>
                  <div
                    className="transition-transform duration-300 hover:scale-[1.03]"
                    style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.5))' }}
                  >
                    <BadgeRectoVerso
                      agent={agentData}
                      logoUrl="/logo-ivos.jpg"
                      qrUrl={qrUrl}
                      bandColor={BADGE_BRAND.primary}
                      legalPhone={baseConfig.phone}
                      legalAddress={baseConfig.address}
                      face="recto"
                    />
                  </div>
                </div>

                {/* Séparateur vertical */}
                <div className="hidden sm:flex flex-col items-center gap-2 self-stretch justify-center">
                  <div className="flex-1 w-px bg-white/10" />
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-2">vs</span>
                  <div className="flex-1 w-px bg-white/10" />
                </div>

                {/* VERSO */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Verso — Face arrière</span>
                  </div>
                  <div
                    className="transition-transform duration-300 hover:scale-[1.03]"
                    style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.5))' }}
                  >
                    <BadgeRectoVerso
                      agent={agentData}
                      logoUrl="/logo-ivos.jpg"
                      qrUrl={qrUrl}
                      bandColor={BADGE_BRAND.primary}
                      legalPhone={baseConfig.phone}
                      legalAddress={baseConfig.address}
                      face="verso"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-white/25 text-center max-w-sm leading-relaxed">
                Rendu fidèle à l'impression. Les données légales (téléphone, adresse) sont récupérées dynamiquement depuis la <span className="text-white/40 font-semibold">Configuration de base</span>.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BadgeConception;
