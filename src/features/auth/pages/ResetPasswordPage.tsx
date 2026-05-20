import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, ChevronLeft } from 'lucide-react';
import { supabase } from '../../../shared/services/supabaseClient';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Listen for Supabase PASSWORD_RECOVERY event from the magic link
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    // Also check if we already have a session (user clicked the link and was redirected)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        toast.success('Mot de passe réinitialisé avec succès !', { duration: 5000 });
        navigate('/login');
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Nouveau mot de passe
          </h1>
          <p className="mt-1.5 text-sm font-medium text-gray-400">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {/* Card */}
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

          {!sessionReady ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-gray-500">
                Vérification de votre lien de réinitialisation en cours…
              </p>
              <p className="text-xs text-gray-400">
                Si vous n'avez pas reçu de lien, retournez à la{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
                >
                  page de connexion
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
                    <Lock className="h-4 w-4 text-red-500" />
                  </div>
                  {error}
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nouveau mot de passe
                </label>
                <div
                  className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                    passwordFocused ? 'bg-white shadow-sm ring-2 ring-blue-500/25' : 'bg-gray-50/80'
                  }`}
                >
                  <div
                    className={`pl-4 transition-colors duration-200 ${passwordFocused ? 'text-blue-500' : 'text-gray-400'}`}
                  >
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoFocus
                    placeholder="••••••••"
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
                <p className="mt-1.5 pl-1 text-[10px] text-gray-400">Minimum 6 caractères</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Confirmer le mot de passe
                </label>
                <div
                  className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                    confirmFocused ? 'bg-white shadow-sm ring-2 ring-blue-500/25' : 'bg-gray-50/80'
                  }`}
                >
                  <div
                    className={`pl-4 transition-colors duration-200 ${confirmFocused ? 'text-blue-500' : 'text-gray-400'}`}
                  >
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    required
                    placeholder="••••••••"
                    className="w-full border-0 bg-transparent px-3 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:bg-blue-800 disabled:opacity-50 disabled:shadow-none"
              >
                <ShieldCheck className="h-4.5 w-4.5" />
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs font-medium text-gray-400">
          IVOS — For your operations, think IVOS!
        </p>
      </div>
    </div>
  );
}
