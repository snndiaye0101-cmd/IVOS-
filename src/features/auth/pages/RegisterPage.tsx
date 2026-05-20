import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  UserPlus,
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
  ChevronLeft,
  User,
  Mail,
  Lock,
} from 'lucide-react';
import { sendNotification } from '../../../shared/services/notificationService';

export default function RegisterPage() {
  const { register, allUsers } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailRegFocused, setEmailRegFocused] = useState(false);
  const [passwordRegFocused, setPasswordRegFocused] = useState(false);
  const [confirmRegFocused, setConfirmRegFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    const result = register(fullName, email, password);
    if (result.success) {
      const admin = allUsers.find((u) => u.role === 'Admin');
      if (admin) {
        sendNotification({
          userId: admin.id,
          type: 'other',
          title: 'Nouvelle inscription',
          message: `Nouvelle demande de compte : ${fullName} (${email})`,
          entityType: 'user',
          metadata: { fullName, email },
        });
      }
      setPendingApproval(true);
    } else {
      setError(result.error || 'Erreur lors de la création du compte');
    }
    setLoading(false);
  };

  if (pendingApproval) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FC] px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-100/30 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-[440px] text-center">
          <img
            src="/logo-ivos.jpg"
            alt="IVOS"
            className="mx-auto mb-5 h-28 rounded-2xl object-contain drop-shadow-lg"
          />
          <div
            className="rounded-3xl bg-white p-8 sm:p-10"
            style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="mb-2 text-xl font-extrabold text-gray-900">Compte créé avec succès !</h2>
            <p className="mb-6 text-sm text-gray-500">
              Votre demande de compte est en attente de validation par un administrateur. Vous
              recevrez l'accès une fois votre compte approuvé.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 active:bg-blue-800"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </Link>
          </div>
          <p className="mt-8 text-center text-xs font-medium text-gray-400">
            IVOS — For your operations, think IVOS!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7FC] px-4">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-100/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img
            src="/logo-ivos.jpg"
            alt="IVOS"
            className="mx-auto mb-5 h-28 rounded-2xl object-contain drop-shadow-lg"
          />
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Créer un compte</h1>
          <p className="mt-1.5 text-sm font-medium text-gray-400">Rejoignez la plateforme IVOS</p>
        </div>

        {/* Card — Neumorphism */}
        <div
          className="rounded-3xl bg-white p-8 sm:p-10"
          style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
        >
          {/* Back button — inside card */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="group mb-5 flex min-h-[44px] items-center gap-1.5 text-sm text-gray-400 transition-colors duration-200 hover:text-blue-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <Lock className="h-4 w-4 text-red-500" />
                </div>
                {error}
              </div>
            )}

            {/* Nom complet */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Nom complet
              </label>
              <div
                className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                  fullNameFocused ? 'bg-white shadow-sm ring-2 ring-blue-500/25' : 'bg-gray-50/80'
                }`}
              >
                <div
                  className={`pl-4 transition-colors duration-200 ${fullNameFocused ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  required
                  placeholder="Prénom Nom"
                  className="w-full border-0 bg-transparent px-3 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email
              </label>
              <div
                className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                  emailRegFocused ? 'bg-white shadow-sm ring-2 ring-blue-500/25' : 'bg-gray-50/80'
                }`}
              >
                <div
                  className={`pl-4 transition-colors duration-200 ${emailRegFocused ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailRegFocused(true)}
                  onBlur={() => setEmailRegFocused(false)}
                  required
                  placeholder="votre@email.sn"
                  className="w-full border-0 bg-transparent px-3 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mot de passe
              </label>
              <div
                className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                  passwordRegFocused
                    ? 'bg-white shadow-sm ring-2 ring-blue-500/25'
                    : 'bg-gray-50/80'
                }`}
              >
                <div
                  className={`pl-4 transition-colors duration-200 ${passwordRegFocused ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordRegFocused(true)}
                  onBlur={() => setPasswordRegFocused(false)}
                  required
                  placeholder="Minimum 6 caractères"
                  className="w-full border-0 bg-transparent px-3 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-4 text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmer */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Confirmer le mot de passe
              </label>
              <div
                className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                  confirmRegFocused ? 'bg-white shadow-sm ring-2 ring-blue-500/25' : 'bg-gray-50/80'
                }`}
              >
                <div
                  className={`pl-4 transition-colors duration-200 ${confirmRegFocused ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmRegFocused(true)}
                  onBlur={() => setConfirmRegFocused(false)}
                  required
                  placeholder="Retapez le mot de passe"
                  className="w-full border-0 bg-transparent px-3 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:bg-blue-800 disabled:opacity-50 disabled:shadow-none"
            >
              <UserPlus className="h-4.5 w-4.5" />
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs font-medium text-gray-400">ou</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Vous avez déjà un compte ?{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-gray-400">
          IVOS — For your operations, think IVOS!
        </p>
      </div>
    </div>
  );
}
