import React, { useState } from 'react';
// Simulé : historique d'audit utilisateur (à remplacer par un fetch API réel)
const mockAuditLog = [
  { date: '2026-04-24 21:12', action: 'Connexion réussie', ip: '192.168.1.10', device: 'MacBook Chrome' },
  { date: '2026-04-24 20:55', action: 'Changement de mot de passe', ip: '192.168.1.10', device: 'MacBook Chrome' },
  { date: '2026-04-23 18:02', action: 'Tentative de connexion échouée', ip: '192.168.1.11', device: 'iPhone Safari' },
  { date: '2026-04-22 09:30', action: 'Déconnexion', ip: '192.168.1.10', device: 'MacBook Chrome' },
];
import { Shield, Eye, EyeOff, CheckCircle, Circle, Lock, Key, UserCheck, Clock } from 'lucide-react';

function checkComplexity(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function SecuritySettings() {
  const [currentPwd, setCurrentPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');
  const [success, setSuccess] = useState('');
  // 2FA simulation
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const backupCodes = [
    '8F2D-1A9C', '3B7E-4C2F', '6D1A-7E3B', '9C8F-2B1D', '5A6E-3C7B'
  ];

  const complexity = checkComplexity(newPwd);
  const rules = [
    { key: 'length', label: '8 caractères minimum', ok: complexity.length },
    { key: 'uppercase', label: '1 lettre majuscule', ok: complexity.uppercase },
    { key: 'number', label: '1 chiffre', ok: complexity.number },
    { key: 'special', label: '1 caractère spécial', ok: complexity.special },
  ];
  const isValid = rules.every(r => r.ok);
  const match = newPwd === confirmPwd && newPwd.length > 0;
  const canSubmit = isValid && match && currentPwd.length > 0;
  const strength = rules.filter(r => r.ok).length;
  const strengthMap = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSuccess('Mot de passe mis à jour avec succès');
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setTimeout(() => setSuccess(''), 4000);
  }

  return (
    <div className="w-full min-h-screen">
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Shield className="w-7 h-7" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sécurité & Accès</h1>
          <p className="text-sm text-gray-300">Gestion des mots de passe et politiques de sécurité</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white shrink-0"><Lock className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">Politique active</p><p className="text-lg font-bold text-gray-900">Stricte</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shrink-0"><Clock className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">Dernière modification</p><p className="text-lg font-bold text-gray-900">15 jan 2026</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shrink-0"><UserCheck className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">Sessions actives</p><p className="text-lg font-bold text-gray-900">1</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shrink-0"><Key className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">2FA</p>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {twoFAEnabled ? 'Activé' : 'Désactivé'}
                <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShow2FASetup(true)}>
                  {twoFAEnabled ? 'Gérer' : 'Activer'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Section 2FA interactive */}
      {show2FASetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setShow2FASetup(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Key className="w-5 h-5 text-purple-600" /> Authentification à deux facteurs</h3>
            {twoFAEnabled ? (
              <>
                <p className="text-gray-700 mb-3">2FA est activé sur ce compte.</p>
                <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold mb-2" onClick={() => { setTwoFAEnabled(false); setShow2FASetup(false); }}>Désactiver 2FA</button>
                <button className="ml-2 underline text-blue-600 text-xs" onClick={() => setShowBackupCodes(true)}>Afficher les codes de secours</button>
              </>
            ) : (
              <>
                <p className="text-gray-700 mb-3">Activez la 2FA pour renforcer la sécurité de votre compte.</p>
                <div className="flex flex-col items-center mb-3">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=otpauth://totp/IVOS:demo@example.com?secret=JBSWY3DPEHPK3PXP" alt="QR Code 2FA" className="mb-2" />
                  <span className="text-xs text-gray-500">Scannez ce QR code avec Google Authenticator</span>
                </div>
                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold" onClick={() => { setTwoFAEnabled(true); setShow2FASetup(false); }}>Activer 2FA</button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Codes de secours 2FA */}
      {showBackupCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setShowBackupCodes(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Key className="w-5 h-5 text-purple-600" /> Codes de secours</h3>
            <ul className="mb-3 grid grid-cols-2 gap-2">
              {backupCodes.map(code => <li key={code} className="bg-gray-100 rounded-lg px-3 py-2 text-center font-mono text-sm text-gray-700">{code}</li>)}
            </ul>
            <p className="text-xs text-gray-500">Conservez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule fois.</p>
          </div>
        </div>
      )}
      {/* Audit log utilisateur */}
      <div className="mt-10">
        <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-600" /> Historique de sécurité</h2>
        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Action</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">IP</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Appareil</th>
              </tr>
            </thead>
            <tbody>
              {mockAuditLog.map((log, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{log.date}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{log.action}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{log.ip}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{log.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase mb-5 flex items-center gap-2"><Lock className="w-4 h-4 text-blue-600" /> Modifier le mot de passe</h2>

          {success && <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 font-semibold text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {newPwd.length > 0 && (
                <>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength ? strengthColor[strength] : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Force : <span className="font-semibold">{strengthMap[strength]}</span></p>
                </>
              )}

              <div className="grid grid-cols-2 gap-2 mt-3">
                {rules.map(r => (
                  <div key={r.key} className="flex items-center gap-1.5">
                    {r.ok ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                    <span className={`text-xs ${r.ok ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmation</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPwd.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  {match ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                  <span className={`text-xs ${match ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>Identique au nouveau</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1a1a2e] to-[#0f3460] text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mettre à jour le mot de passe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
