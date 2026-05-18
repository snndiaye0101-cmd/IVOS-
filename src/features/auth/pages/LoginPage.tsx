import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { authStore } from '../../../shared/services/authStore'
import { LogIn, Eye, EyeOff, Clock, Mail, Lock, ChevronLeft, Send, Target, Users2, Truck, Wallet } from 'lucide-react'
import { sendNotification } from '../../../shared/services/notificationService'
import { supabase } from '../../../shared/services/supabaseClient'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login, allUsers } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo: redirectUrl })
      toast.success('Si cet email existe, un lien de réinitialisation a été envoyé.', { duration: 6000 })
      setShowForgot(false)
      setForgotEmail('')
    } catch {
      toast.success('Si cet email existe, un lien de réinitialisation a été envoyé.', { duration: 6000 })
      setShowForgot(false)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPending(false)
    setLoading(true)

    const result = login(email, password)
    if (result.success) {
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())
      if (user) {
        sendNotification({
          userId: user.id,
          type: 'other',
          title: 'Connexion réussie',
          message: `Connexion réussie pour ${user.email}`,
          entityType: 'user',
          entityId: user.id
        })
      }
      // Redirection intelligente par fonction
      const fonction = user?.fonction?.toLowerCase() || ''
      let target = '/'
      if (fonction.includes('chauffeur')) target = '/operations'
      else if (fonction.includes('comptable') || fonction.includes('financ')) target = '/finances'
      else if (fonction.includes('mécanicien') || fonction.includes('mecanicien') || fonction.includes('maintenance')) target = '/maintenance'
      else if (fonction.includes('opérat') || fonction.includes('bsd') || fonction.includes('collecte') || fonction.includes('déchet')) target = '/exploitation'
      else if (fonction.includes('rh') || fonction.includes('ressources humaines') || fonction.includes('administratif')) target = '/personnel'
      else if (fonction.includes('commercial') || fonction.includes('client')) target = '/clients'
      else if (fonction.includes('flotte') || fonction.includes('logistique')) target = '/vehicles'
      else if (fonction.includes('directeur') || fonction.includes('superviseur') || user?.role === 'Admin') target = '/'
      navigate(target)
    } else if (result.pending) {
      setPending(true)
    } else {
      setError(result.error || 'Erreur de connexion')
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white xl:grid xl:grid-cols-2">
      <div className="absolute inset-0 overflow-hidden pointer-events-none xl:hidden">
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
      </div>

      <section className="relative flex min-h-screen items-center justify-center bg-white px-4 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-xl relative z-10">
          <div className="text-center mb-10 sm:mb-12">
            <img src="/logo-ivos.jpg" alt="IVOS" className="h-36 sm:h-40 mx-auto object-contain mb-7 drop-shadow-xl rounded-3xl" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">Connectez-vous à votre Centre de Pilotage Intégré</h1>
            <p className="text-lg text-slate-400 mt-3 font-semibold">Accédez à l'ensemble de vos flux métier depuis une interface unifiée.</p>
          </div>

          <div className="bg-white rounded-[2rem] min-h-[710px] p-8 sm:p-12 xl:p-14 relative overflow-hidden border border-slate-100" style={{ boxShadow: '0 32px 80px rgba(15,23,42,0.12), 0 12px 32px rgba(37,99,235,0.08)' }}>
          <form onSubmit={handleSubmit} className="space-y-7">
            {pending && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm text-amber-700 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <span className="pt-0.5">Votre compte est en attente de validation par un administrateur.</span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-4 w-4 text-red-500" />
                </div>
                {error}
              </div>
            )}

            {/* Email — Material 3 style */}
            <div>
              <label className="block text-sm font-semibold text-slate-500 uppercase tracking-[0.18em] mb-3">Email</label>
              <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                emailFocused ? 'bg-white border-blue-500 ring-4 ring-blue-500/15 shadow-[0_12px_30px_rgba(37,99,235,0.18)] scale-[1.01]' : 'bg-slate-50 border-slate-200'
              } py-5`}>
                <span className={`pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${emailFocused ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`pl-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${emailFocused ? 'text-blue-600' : 'text-slate-400'}`}>
                  <Mail className="h-6 w-6" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  required
                  placeholder="votre@email.sn"
                  className="w-full px-4 py-5 bg-transparent border-0 text-lg font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Password — Material 3 style */}
            <div>
              <label className="block text-sm font-semibold text-slate-500 uppercase tracking-[0.18em] mb-3">Mot de passe</label>
              <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                passwordFocused ? 'bg-white border-blue-500 ring-4 ring-blue-500/15 shadow-[0_12px_30px_rgba(37,99,235,0.18)] scale-[1.01]' : 'bg-slate-50 border-slate-200'
              } py-5`}>
                <span className={`pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${passwordFocused ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`pl-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${passwordFocused ? 'text-blue-600' : 'text-slate-400'}`}>
                  <Lock className="h-6 w-6" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-5 bg-transparent border-0 text-lg font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-5 text-slate-400 hover:text-slate-600 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                  className="text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            {/* Submit — IVOS blue, large, rounded */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 flex items-center justify-center gap-3 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-2xl text-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-lg shadow-blue-700/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-700/30 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              <LogIn className="h-5 w-5" />
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
          {import.meta.env.DEV && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900 mb-2">Super Admin local (dev)</p>
              <p className="text-xs text-slate-500 mb-3">Crée un compte Super Admin local et connecte-toi automatiquement.</p>
              <button
                type="button"
                onClick={async () => {
                  authStore.ensureSuperAdminLocal()
                  const password = import.meta.env.VITE_AUTH_DEMO_PASSWORD || 'SuperAdmin@IVOS2026'
                  const result = login('superadmin@ivos.sn', password)
                  if (result.success) {
                    navigate('/')
                  } else {
                    setError(result.error || 'Impossible de se connecter en Super Admin')
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
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-400 font-medium">ou</span></div>
            </div>
            <p className="text-base text-slate-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
                Créer un compte
              </Link>
            </p>
          </div>

          {/* Forgot password overlay */}
          {showForgot && (
            <div className="absolute inset-0 bg-white rounded-[2rem] p-8 sm:p-12 xl:p-16 flex flex-col z-10" style={{ boxShadow: '0 32px 80px rgba(15,23,42,0.12), 0 12px 32px rgba(37,99,235,0.08)' }}>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="group flex items-center gap-1.5 min-h-[44px] text-sm text-gray-400 hover:text-blue-600 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] mb-5 self-start"
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>

              <div className="text-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">Mot de passe oublié</h2>
                <p className="text-base text-gray-400 mt-2">Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6 flex-1 flex flex-col">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 uppercase tracking-[0.18em] mb-3">Email</label>
                  <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    forgotEmailFocused ? 'bg-white border-blue-500 ring-4 ring-blue-500/15 shadow-[0_12px_30px_rgba(37,99,235,0.18)] scale-[1.01]' : 'bg-slate-50 border-slate-200'
                  } py-5`}>
                    <span className={`pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${forgotEmailFocused ? 'opacity-100' : 'opacity-0'}`} />
                    <div className={`pl-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${forgotEmailFocused ? 'text-blue-600' : 'text-slate-400'}`}>
                      <Mail className="h-6 w-6" />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      onFocus={() => setForgotEmailFocused(true)}
                      onBlur={() => setForgotEmailFocused(false)}
                      required
                      autoFocus
                      placeholder="votre@email.sn"
                      className="w-full px-4 py-5 bg-transparent border-0 text-lg font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-16 flex items-center justify-center gap-3 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-2xl text-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-lg shadow-blue-700/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-700/30 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 mt-auto"
                >
                  <Send className="h-4.5 w-4.5" />
                  {forgotLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>
            </div>
          )}
          </div>

          <p className="text-center text-sm text-slate-400 mt-8 font-medium">
            IVOS — For your operations, think IVOS!
          </p>
        </div>
      </section>

      <aside className="relative hidden xl:flex min-h-screen overflow-hidden bg-gradient-to-br from-[#07152d] via-[#0d2a52] to-[#2a69d9] text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute bottom-16 right-12 h-72 w-72 rounded-full bg-blue-200/10 blur-3xl" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
          <div className="absolute inset-y-0 left-0 w-px bg-white/15" />
        </div>

        <div className="relative flex h-full w-full flex-col justify-between p-16 2xl:p-20">
          <div className="max-w-xl space-y-8">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold tracking-[0.24em] text-blue-50/90 backdrop-blur-sm">
              IVOS PLATFORM
            </div>

            <div className="space-y-6">
              <img src="/logo-ivos.jpg" alt="IVOS" className="h-28 w-auto rounded-3xl bg-white/95 p-4 shadow-2xl shadow-black/20" />
              <h2 className="text-5xl 2xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
                La Tour de Contrôle Digitale de votre Entreprise.
              </h2>
              <p className="max-w-2xl text-xl leading-8 text-blue-50/78">
                Unifiez vos opérations, gérez votre capital humain, maîtrisez votre logistique et sécurisez vos flux financiers dans une interface unique.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 max-w-3xl self-end">
            <div className="pillar-card pillar-1 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md shadow-xl shadow-black/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 mb-3">
                <Target className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">Exploitation</p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">Suivi des flux et performance terrain.</p>
            </div>
            <div className="pillar-card pillar-2 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md shadow-xl shadow-black/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 mb-3">
                <Users2 className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">Ressources Humaines</p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">Gestion des talents, pointage et conformité.</p>
            </div>
            <div className="pillar-card pillar-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md shadow-xl shadow-black/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 mb-3">
                <Truck className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">Logistique & Flotte</p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">Maintenance préventive, pneumatiques et actifs.</p>
            </div>
            <div className="pillar-card pillar-4 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md shadow-xl shadow-black/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 mb-3">
                <Wallet className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-100/80">Finance & Gestion</p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">Maîtrise des coûts, facturation et dotations.</p>
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
  )
}
