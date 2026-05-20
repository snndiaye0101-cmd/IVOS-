import React, { useState } from 'react';
// Simulé : historique d'audit utilisateur (à remplacer par un fetch API réel)
const mockAuditLog = [
  {
    date: '2026-04-24 21:12',
    action: 'Connexion réussie',
    ip: '192.168.1.10',
    device: 'MacBook Chrome',
  },
  {
    date: '2026-04-24 20:55',
    action: 'Changement de mot de passe',
    ip: '192.168.1.10',
    device: 'MacBook Chrome',
  },
  {
    date: '2026-04-23 18:02',
    action: 'Tentative de connexion échouée',
    ip: '192.168.1.11',
    device: 'iPhone Safari',
  },
  { date: '2026-04-22 09:30', action: 'Déconnexion', ip: '192.168.1.10', device: 'MacBook Chrome' },
];
import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  Circle,
  Lock,
  Key,
  UserCheck,
  Clock,
} from 'lucide-react';

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
  const backupCodes = ['8F2D-1A9C', '3B7E-4C2F', '6D1A-7E3B', '9C8F-2B1D', '5A6E-3C7B'];

  const complexity = checkComplexity(newPwd);
  const rules = [
    { key: 'length', label: '8 caractères minimum', ok: complexity.length },
    { key: 'uppercase', label: '1 lettre majuscule', ok: complexity.uppercase },
    { key: 'number', label: '1 chiffre', ok: complexity.number },
    { key: 'special', label: '1 caractère spécial', ok: complexity.special },
  ];
  const isValid = rules.every((r) => r.ok);
  const match = newPwd === confirmPwd && newPwd.length > 0;
  const canSubmit = isValid && match && currentPwd.length > 0;
  const strength = rules.filter((r) => r.ok).length;
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
    <div className="min-h-screen w-full">
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
          <Shield className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sécurité & Accès</h1>
          <p className="text-sm text-gray-300">
            Gestion des mots de passe et politiques de sécurité
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Politique active</p>
              <p className="text-lg font-bold text-gray-900">Stricte</p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dernière modification</p>
              <p className="text-lg font-bold text-gray-900">15 jan 2026</p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sessions actives</p>
              <p className="text-lg font-bold text-gray-900">1</p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">2FA</p>
              <p className="flex items-center gap-2 text-lg font-bold text-gray-900">
                {twoFAEnabled ? 'Activé' : 'Désactivé'}
                <button
                  type="button"
                  className="ml-2 text-xs text-blue-600 underline"
                  onClick={() => setShow2FASetup(true)}
                >
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
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
              onClick={() => setShow2FASetup(false)}
            >
              &times;
            </button>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <Key className="h-5 w-5 text-purple-600" /> Authentification à deux facteurs
            </h3>
            {twoFAEnabled ? (
              <>
                <p className="mb-3 text-gray-700">2FA est activé sur ce compte.</p>
                <button
                  className="mb-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  onClick={() => {
                    setTwoFAEnabled(false);
                    setShow2FASetup(false);
                  }}
                >
                  Désactiver 2FA
                </button>
                <button
                  className="ml-2 text-xs text-blue-600 underline"
                  onClick={() => setShowBackupCodes(true)}
                >
                  Afficher les codes de secours
                </button>
              </>
            ) : (
              <>
                <p className="mb-3 text-gray-700">
                  Activez la 2FA pour renforcer la sécurité de votre compte.
                </p>
                <div className="mb-3 flex flex-col items-center">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=otpauth://totp/IVOS:demo@example.com?secret=JBSWY3DPEHPK3PXP"
                    alt="QR Code 2FA"
                    className="mb-2"
                  />
                  <span className="text-xs text-gray-500">
                    Scannez ce QR code avec Google Authenticator
                  </span>
                </div>
                <button
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                  onClick={() => {
                    setTwoFAEnabled(true);
                    setShow2FASetup(false);
                  }}
                >
                  Activer 2FA
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Codes de secours 2FA */}
      {showBackupCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
              onClick={() => setShowBackupCodes(false)}
            >
              &times;
            </button>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <Key className="h-5 w-5 text-purple-600" /> Codes de secours
            </h3>
            <ul className="mb-3 grid grid-cols-2 gap-2">
              {backupCodes.map((code) => (
                <li
                  key={code}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-center font-mono text-sm text-gray-700"
                >
                  {code}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500">
              Conservez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule
              fois.
            </p>
          </div>
        </div>
      )}
      {/* Audit log utilisateur */}
      <div className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-gray-800">
          <Eye className="h-4 w-4 text-blue-600" /> Historique de sécurité
        </h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-md">
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
                  <td className="whitespace-nowrap px-4 py-2">{log.date}</td>
                  <td className="whitespace-nowrap px-4 py-2">{log.action}</td>
                  <td className="whitespace-nowrap px-4 py-2">{log.ip}</td>
                  <td className="whitespace-nowrap px-4 py-2">{log.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-xl">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase text-gray-800">
            <Lock className="h-4 w-4 text-blue-600" /> Modifier le mot de passe
          </h2>

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {newPwd.length > 0 && (
                <>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i <= strength ? strengthColor[strength] : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Force : <span className="font-semibold">{strengthMap[strength]}</span>
                  </p>
                </>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {rules.map((r) => (
                  <div key={r.key} className="flex items-center gap-1.5">
                    {r.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-gray-300" />
                    )}
                    <span
                      className={`text-xs ${r.ok ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                    >
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Confirmation
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPwd.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  {match ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-gray-300" />
                  )}
                  <span
                    className={`text-xs ${match ? 'font-semibold text-green-700' : 'text-gray-500'}`}
                  >
                    Identique au nouveau
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-gradient-to-r from-[#1a1a2e] to-[#0f3460] py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mettre à jour le mot de passe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
