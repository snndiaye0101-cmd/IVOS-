import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, ChevronLeft } from 'lucide-react'
import { supabase } from '../../../shared/services/supabaseClient'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Listen for Supabase PASSWORD_RECOVERY event from the magic link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    // Also check if we already have a session (user clicked the link and was redirected)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
      } else {
        toast.success('Mot de passe réinitialisé avec succès !', { duration: 5000 })
        navigate('/login')
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-ivos.jpg" alt="IVOS" className="h-28 mx-auto object-contain mb-5 drop-shadow-lg rounded-2xl" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}>
          {/* Back button — inside card */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="group flex items-center gap-1.5 min-h-[44px] text-sm text-gray-400 hover:text-blue-600 transition-colors duration-200 mb-5"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>

          {!sessionReady ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-gray-500">
                Vérification de votre lien de réinitialisation en cours…
              </p>
              <p className="text-xs text-gray-400">
                Si vous n'avez pas reçu de lien, retournez à la{' '}
                <button onClick={() => navigate('/login')} className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                  page de connexion
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-4 w-4 text-red-500" />
                  </div>
                  {error}
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nouveau mot de passe</label>
                <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                  passwordFocused ? 'bg-white ring-2 ring-blue-500/25 shadow-sm' : 'bg-gray-50/80'
                }`}>
                  <div className={`pl-4 transition-colors duration-200 ${passwordFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoFocus
                    placeholder="••••••••"
                    className="w-full px-3 py-3.5 bg-transparent border-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 pl-1">Minimum 6 caractères</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirmer le mot de passe</label>
                <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                  confirmFocused ? 'bg-white ring-2 ring-blue-500/25 shadow-sm' : 'bg-gray-50/80'
                }`}>
                  <div className={`pl-4 transition-colors duration-200 ${confirmFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-3.5 bg-transparent border-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none"
              >
                <ShieldCheck className="h-4.5 w-4.5" />
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 font-medium">
          IVOS — For your operations, think IVOS!
        </p>
      </div>
    </div>
  )
}
