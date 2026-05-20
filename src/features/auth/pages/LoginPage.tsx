import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { authStore } from '../../../shared/services/authStore';
import {
  LogIn,
  Eye,
  EyeOff,
  Clock,
  Mail,
  Lock,
  ChevronLeft,
  Send,
  Target,
  Users2,
  Truck,
  Wallet,
} from 'lucide-react';
import { sendNotification } from '../../../shared/services/notificationService';
import { supabase, isSupabaseConfigured } from '../../../shared/services/supabaseClient';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, allUsers } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false);

  const defaultLoginEmail = import.meta.env.VITE_DEFAULT_LOGIN_EMAIL || 'superadmin@ivos.sn';
  const defaultLoginPassword =
    import.meta.env.VITE_DEFAULT_LOGIN_PASSWORD ||
    import.meta.env.VITE_AUTH_DEMO_PASSWORD ||
    'SuperAdmin@IVOS2026';

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo: redirectUrl });
      toast.success('Si cet email existe, un lien de réinitialisation a été envoyé.', {
        duration: 6000,
      });
      setShowForgot(false);
      setForgotEmail('');
    } catch {
      toast.success('Si cet email existe, un lien de réinitialisation a été envoyé.', {
        duration: 6000,
      });
      setShowForgot(false);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(false);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const isSuperAdminLogin =
      normalizedEmail === defaultLoginEmail.toLowerCase() && password === defaultLoginPassword;

    if (isSuperAdminLogin) {
      authStore.ensureSuperAdminLocal();
      const result = login(email, password);
      if (result.success && result.user) {
        const mockSession = {
          userId: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role,
          fonction: result.user.fonction,
          issuedAt: new Date().toISOString(),
          offline: true,
        };
        try {
          localStorage.setItem('ivos_session', JSON.stringify(mockSession));
        } catch {
          // Ignore localStorage errors in offline fallback mode
        }
        setLoading(false);
        navigate('/dashboard');
        return;
      }
      setError(result.error || 'Erreur de connexion pour le Super Admin local');
      setLoading(false);
      return;
    }

    if (!import.meta.env.VITE_SUPABASE_URL && !isSupabaseConfigured) {
      setError('Mode local actif. Seuls les identifiants SuperAdmin par défaut sont autorisés.');
      setLoading(false);
      return;
    }

    const result = login(email, password);
    if (result.success) {
      const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        sendNotification({
          userId: user.id,
          type: 'other',
          title: 'Connexion réussie',
          message: `Connexion réussie pour ${user.email}`,
          entityType: 'user',
          entityId: user.id,
        });
      }
      // Redirection intelligente par fonction
      const fonction = user?.fonction?.toLowerCase() || '';
      let target = '/';
      if (fonction.includes('chauffeur')) target = '/operations';
      else if (fonction.includes('comptable') || fonction.includes('financ')) target = '/finances';
      else if (
        fonction.includes('mécanicien') ||
        fonction.includes('mecanicien') ||
        fonction.includes('maintenance')
      )
        target = '/maintenance';
      else if (
        fonction.includes('opérat') ||
        fonction.includes('bsd') ||
        fonction.includes('collecte') ||
        fonction.includes('déchet')
      )
        target = '/exploitation';
      else if (
        fonction.includes('rh') ||
        fonction.includes('ressources humaines') ||
        fonction.includes('administratif')
      )
        target = '/personnel';
      else if (fonction.includes('commercial') || fonction.includes('client')) target = '/clients';
      else if (fonction.includes('flotte') || fonction.includes('logistique')) target = '/vehicles';
      else if (
        fonction.includes('directeur') ||
        fonction.includes('superviseur') ||
        user?.role === 'Admin'
      )
        target = '/';
      navigate(target);
    } else if (result.pending) {
      setPending(true);
    } else {
      setError(result.error || 'Erreur de connexion');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white xl:grid xl:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 overflow-hidden xl:hidden">
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
      </div>

      <section className="relative flex min-h-screen items-center justify-center bg-white px-4 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="relative z-10 w-full max-w-xl">
          <div className="mb-10 text-center sm:mb-12">
            <img
              src="/logo-ivos.jpg"
              alt="IVOS"
              className="mx-auto mb-7 h-36 rounded-3xl object-contain drop-shadow-xl sm:h-40"
            />
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Connectez-vous à votre Centre de Pilotage Intégré
            </h1>
            <p className="mt-3 text-lg font-semibold text-slate-400">
              Accédez à l'ensemble de vos flux métier depuis une interface unifiée.
            </p>
          </div>

          <div
            className="relative min-h-[710px] overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-8 sm:p-12 xl:p-14"
            style={{
              boxShadow: '0 32px 80px rgba(15,23,42,0.12), 0 12px 32px rgba(37,99,235,0.08)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-7">
              {pending && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="pt-0.5">
                    Votre compte est en attente de validation par un administrateur.
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
                    <Lock className="h-4 w-4 text-red-500" />
                  </div>
                  {error}
                </div>
              )}

              {/* Email — Material 3 style */}
              <div>
                <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email
                </label>
                <div
                  className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    emailFocused
                      ? 'scale-[1.01] border-blue-500 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.18)] ring-4 ring-blue-500/15'
                      : 'border-slate-200 bg-slate-50'
                  } py-5`}
                >
                  <span
                    className={`pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${emailFocused ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <div
                    className={`pl-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${emailFocused ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    <Mail className="h-6 w-6" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    placeholder="votre@email.sn"
                    className="w-full border-0 bg-transparent px-4 py-5 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password — Material 3 style */}
              <div>
                <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Mot de passe
                </label>
                <div
                  className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    passwordFocused
                      ? 'scale-[1.01] border-blue-500 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.18)] ring-4 ring-blue-500/15'
                      : 'border-slate-200 bg-slate-50'
                  } py-5`}
                >
                  <span
                    className={`pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${passwordFocused ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <div
                    className={`pl-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${passwordFocused ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    <Lock className="h-6 w-6" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    placeholder="••••••••"
                    className="w-full border-0 bg-transparent px-4 py-5 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-5 text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setForgotEmail(email);
                    }}
                    className="text-xs font-medium text-gray-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-blue-600"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {/* Submit — IVOS blue, large, rounded */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 text-lg font-extrabold text-white shadow-lg shadow-blue-700/25 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-700/30 active:bg-blue-800 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
              >
                <LogIn className="h-5 w-5" />
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-2 font-semibold text-slate-900">Identifiants de test</p>
              <p>
                Adresse email&nbsp;: <span className="font-semibold">{defaultLoginEmail}</span>
              </p>
              <p>
                Mot de passe&nbsp;: <span className="font-semibold">{defaultLoginPassword}</span>
              </p>
            </div>
            {!isSupabaseConfigured && (
              <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="mb-2 font-semibold text-amber-900">Variables Supabase manquantes</p>
                <p>
                  Le site ne peut pas se connecter à Supabase tant que les variables d'environnement
                  suivantes ne sont pas renseignées :
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>
                    <code>VITE_SUPABASE_URL</code>
                  </li>
                  <li>
                    <code>VITE_SUPABASE_ANON_KEY</code>
                  </li>
                </ul>
                <p className="mt-2">
                  Ajoute-les dans Netlify et relance un déploiement avec vidage du cache.
                </p>
              </div>
            )}
            {/* Debug helper for test site only */}
            {typeof window !== 'undefined' &&
              window.location &&
              window.location.hostname.includes('ivostest.netlify.app') && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        // Ensure super admin exists and try to login
                        await authStore.ensureDefaultSuperAdmin();
                        const password =
                          import.meta.env.VITE_DEFAULT_LOGIN_PASSWORD ||
                          import.meta.env.VITE_AUTH_DEMO_PASSWORD ||
                          'SuperAdmin@IVOS2026';
                        const result = login('superadmin@ivos.sn', password);
                        if (result.success) {
                          navigate('/');
                        } else {
                          setError(result.error || 'Échec de la connexion debug');
                        }
                      } catch (e) {
                        setError('Erreur debug: ' + (e as Error).message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
                  >
                    Forcer création SuperAdmin (test)
                  </button>
                </div>
              )}
            {import.meta.env.DEV && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="mb-2 font-semibold text-slate-900">Super Admin local (dev)</p>
                <p className="mb-3 text-xs text-slate-500">
                  Crée un compte Super Admin local et connecte-toi automatiquement.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    authStore.ensureSuperAdminLocal();
                    const password =
                      import.meta.env.VITE_AUTH_DEMO_PASSWORD || 'SuperAdmin@IVOS2026';
                    const result = login('superadmin@ivos.sn', password);
                    if (result.success) {
                      navigate('/');
                    } else {
                      setError(result.error || 'Impossible de se connecter en Super Admin');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                >
                  Se connecter en Super Admin
                </button>
              </div>
            )}

            <div className="mt-10 text-center">
              <div className="relative mb-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm font-medium text-gray-400">ou</span>
                </div>
              </div>
              <p className="text-base text-slate-500">
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-blue-600 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-blue-800"
                >
                  Créer un compte
                </Link>
              </p>
            </div>

            {/* Forgot password overlay */}
            {showForgot && (
              <div
                className="absolute inset-0 z-10 flex flex-col rounded-[2rem] bg-white p-8 sm:p-12 xl:p-16"
                style={{
                  boxShadow: '0 32px 80px rgba(15,23,42,0.12), 0 12px 32px rgba(37,99,235,0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="group mb-5 flex min-h-[44px] items-center gap-1.5 self-start text-sm text-gray-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-blue-600"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>

                <div className="mb-7 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Mot de passe oublié</h2>
                  <p className="mt-2 text-base text-gray-400">
                    Entrez votre adresse email pour recevoir un lien de réinitialisation.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="flex flex-1 flex-col space-y-6">
                  <div>
                    <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Email
                    </label>
                    <div
                      className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        forgotEmailFocused
                          ? 'scale-[1.01] border-blue-500 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.18)] ring-4 ring-blue-500/15'
                          : 'border-slate-200 bg-slate-50'
                      } py-5`}
                    >
                      <span
                        className={`pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${forgotEmailFocused ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <div
                        className={`pl-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${forgotEmailFocused ? 'text-blue-600' : 'text-slate-400'}`}
                      >
                        <Mail className="h-6 w-6" />
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        onFocus={() => setForgotEmailFocused(true)}
                        onBlur={() => setForgotEmailFocused(false)}
                        required
                        autoFocus
                        placeholder="votre@email.sn"
                        className="w-full border-0 bg-transparent px-4 py-5 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="mt-auto flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 text-lg font-extrabold text-white shadow-lg shadow-blue-700/25 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-700/30 active:bg-blue-800 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                  >
                    <Send className="h-4.5 w-4.5" />
                    {forgotLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm font-medium text-slate-400">
            IVOS — For your operations, think IVOS!
          </p>
        </div>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#07152d] via-[#0d2a52] to-[#2a69d9] text-white xl:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute bottom-16 right-12 h-72 w-72 rounded-full bg-blue-200/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
            }}
          />
          <div className="absolute inset-y-0 left-0 w-px bg-white/15" />
        </div>

        <div className="relative flex h-full w-full flex-col justify-between p-16 2xl:p-20">
          <div className="max-w-xl space-y-8">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold tracking-[0.24em] text-blue-50/90 backdrop-blur-sm">
              IVOS PLATFORM
            </div>

            <div className="space-y-6">
              <img
                src="/logo-ivos.jpg"
                alt="IVOS"
                className="h-28 w-auto rounded-3xl bg-white/95 p-4 shadow-2xl shadow-black/20"
              />
              <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tight 2xl:text-6xl">
                La Tour de Contrôle Digitale de votre Entreprise.
              </h2>
              <p className="text-blue-50/78 max-w-2xl text-xl leading-8">
                Unifiez vos opérations, gérez votre capital humain, maîtrisez votre logistique et
                sécurisez vos flux financiers dans une interface unique.
              </p>
            </div>
          </div>

          <div className="grid max-w-3xl grid-cols-1 gap-4 self-end 2xl:grid-cols-2">
            <div className="pillar-card pillar-1 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Target className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">Exploitation</p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">
                Suivi des flux et performance terrain.
              </p>
            </div>
            <div className="pillar-card pillar-2 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Users2 className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">
                Ressources Humaines
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">
                Gestion des talents, pointage et conformité.
              </p>
            </div>
            <div className="pillar-card pillar-3 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Truck className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">
                Logistique & Flotte
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">
                Maintenance préventive, pneumatiques et actifs.
              </p>
            </div>
            <div className="pillar-card pillar-4 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Wallet className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">
                Finance & Gestion
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">
                Maîtrise des coûts, facturation et dotations.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes pillarIn {
          from { opacity: 0; transform: translateY(16px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pillar-card {
          opacity: 0;
          animation: pillarIn 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        .pillar-1 { animation-delay: 100ms; }
        .pillar-2 { animation-delay: 180ms; }
        .pillar-3 { animation-delay: 260ms; }
        .pillar-4 { animation-delay: 340ms; }
        @media (prefers-reduced-motion: reduce) {
          .pillar-card {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
