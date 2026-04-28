import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { UserPlus, Eye, EyeOff, Clock, ArrowLeft, ChevronLeft, User, Mail, Lock } from 'lucide-react'
import { sendNotification } from '../../../shared/services/notificationService'

export default function RegisterPage() {
  const { register, allUsers } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)

  const [fullNameFocused, setFullNameFocused] = useState(false)
  const [emailRegFocused, setEmailRegFocused] = useState(false)
  const [passwordRegFocused, setPasswordRegFocused] = useState(false)
  const [confirmRegFocused, setConfirmRegFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    const result = register(fullName, email, password)
    if (result.success) {
      const admin = allUsers.find(u => u.role === 'Admin')
      if (admin) {
        sendNotification({
          userId: admin.id,
          type: 'other',
          title: 'Nouvelle inscription',
          message: `Nouvelle demande de compte : ${fullName} (${email})`,
          entityType: 'user',
          metadata: { fullName, email }
        })
      }
      setPendingApproval(true)
    } else {
      setError(result.error || "Erreur lors de la création du compte")
    }
    setLoading(false)
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-[440px] relative z-10 text-center">
          <img src="/logo-ivos.jpg" alt="IVOS" className="h-28 mx-auto object-contain mb-5 drop-shadow-lg rounded-2xl" />
          <div className="bg-white rounded-3xl p-8 sm:p-10" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Compte créé avec succès !</h2>
            <p className="text-sm text-gray-500 mb-6">
              Votre demande de compte est en attente de validation par un administrateur.
              Vous recevrez l'accès une fois votre compte approuvé.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-600/25"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </Link>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8 font-medium">IVOS — For your operations, think IVOS!</p>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Créer un compte</h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">Rejoignez la plateforme IVOS</p>
        </div>

        {/* Card — Neumorphism */}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-4 w-4 text-red-500" />
                </div>
                {error}
              </div>
            )}

            {/* Nom complet */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nom complet</label>
              <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                fullNameFocused ? 'bg-white ring-2 ring-blue-500/25 shadow-sm' : 'bg-gray-50/80'
              }`}>
                <div className={`pl-4 transition-colors duration-200 ${fullNameFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  required
                  placeholder="Prénom Nom"
                  className="w-full px-3 py-3.5 bg-transparent border-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
              <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                emailRegFocused ? 'bg-white ring-2 ring-blue-500/25 shadow-sm' : 'bg-gray-50/80'
              }`}>
                <div className={`pl-4 transition-colors duration-200 ${emailRegFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailRegFocused(true)}
                  onBlur={() => setEmailRegFocused(false)}
                  required
                  placeholder="votre@email.sn"
                  className="w-full px-3 py-3.5 bg-transparent border-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mot de passe</label>
              <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                passwordRegFocused ? 'bg-white ring-2 ring-blue-500/25 shadow-sm' : 'bg-gray-50/80'
              }`}>
                <div className={`pl-4 transition-colors duration-200 ${passwordRegFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPasswordRegFocused(true)}
                  onBlur={() => setPasswordRegFocused(false)}
                  required
                  placeholder="Minimum 6 caractères"
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
            </div>

            {/* Confirmer */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirmer le mot de passe</label>
              <div className={`relative flex items-center rounded-2xl transition-all duration-200 ${
                confirmRegFocused ? 'bg-white ring-2 ring-blue-500/25 shadow-sm' : 'bg-gray-50/80'
              }`}>
                <div className={`pl-4 transition-colors duration-200 ${confirmRegFocused ? 'text-blue-500' : 'text-gray-400'}`}>
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmRegFocused(true)}
                  onBlur={() => setConfirmRegFocused(false)}
                  required
                  placeholder="Retapez le mot de passe"
                  className="w-full px-3 py-3.5 bg-transparent border-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none"
            >
              <UserPlus className="h-4.5 w-4.5" />
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-medium">ou</span></div>
            </div>
            <p className="text-sm text-gray-500">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 font-medium">
          IVOS — For your operations, think IVOS!
        </p>
      </div>
    </div>
  )
}
