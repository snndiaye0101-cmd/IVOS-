import React, { useState, useRef } from 'react'

import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  CheckCircle2, 
  Building2, 
  Package, 
  Truck, 
  MapPin,
  AlertTriangle,
  PenTool
} from 'lucide-react'
import { sendNotification } from '../../../shared/services/notificationService'
import { useAuth } from '../../../shared/contexts/AuthContext'

type Section = 'A' | 'B' | 'C' | 'D'

export default function CreateWasteFormPage() {
  // const { site, year } = useContextSelector(); // Décommente si tu utilises ces variables
  const navigate = useNavigate()
  const { allUsers } = useAuth()
  const [currentSection, setCurrentSection] = useState<Section>('A')
  const [completedSections, setCompletedSections] = useState<Section[]>([])
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Form data state
  const [formData, setFormData] = useState({
    // Section A: Producteur
    producer_name: '',
    producer_address: '',
    producer_ninea: '',
    producer_contact: '',
    producer_phone: '',
    producer_email: '',
    
    // Section B: Caractérisation des déchets
    waste_code: '',
    waste_description: '',
    waste_state: 'solide' as 'gazeux' | 'liquide' | 'solide' | 'boues',
    packaging_type: 'benne' as 'benne' | 'citerne' | 'fut' | 'sac' | 'autre',
    packaging_count: 1,
    estimated_quantity: 0,
    quantity_unit: 'tonnes' as 'tonnes' | 'kg' | 'litres' | 'm3',
    is_dangerous: false,
    un_number: '',
    hazard_class: '',
    
    // Section C: Transporteur
    transport_company: '',
    vehicle_registration: '',
    driver_name: '',
    driver_license: '',
    pickup_date: '',
    
    // Section D: Destination
    receiver_name: '',
    receiver_address: '',
    receiver_ninea: '',
    receiver_contact: '',
    reception_date: '',
    actual_weight: 0,
    weight_unit: 'tonnes' as 'tonnes' | 'kg',
    acceptance_status: 'OUI' as 'OUI' | 'NON' | 'PARTIEL',
    refusal_reason: ''
  })

  const sections = [
    { id: 'A' as Section, title: 'A - Producteur', icon: Building2, color: 'orange' },
    { id: 'B' as Section, title: 'B - Déchet', icon: Package, color: 'red' },
    { id: 'C' as Section, title: 'C - Transporteur', icon: Truck, color: 'blue' },
    { id: 'D' as Section, title: 'D - Destination', icon: MapPin, color: 'green' }
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateSection = (section: Section): boolean => {
    switch (section) {
      case 'A':
        return !!(formData.producer_name && formData.producer_address && formData.producer_ninea)
      case 'B':
        return !!(formData.waste_description && formData.estimated_quantity > 0)
      case 'C':
        return !!(formData.transport_company && formData.vehicle_registration && formData.driver_name)
      case 'D':
        return !!(formData.receiver_name && formData.receiver_address)
      default:
        return false
    }
  }

  const handleNextSection = () => {
    if (validateSection(currentSection)) {
      if (!completedSections.includes(currentSection)) {
        setCompletedSections([...completedSections, currentSection])
      }
      
      const currentIndex = sections.findIndex(s => s.id === currentSection)
      if (currentIndex < sections.length - 1) {
        setCurrentSection(sections[currentIndex + 1].id)
      }
    } else {
      alert('Veuillez remplir tous les champs obligatoires')
    }
  }

  const handlePreviousSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection)
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id)
    }
  }

  const handleSaveDraft = () => {
    console.log('Sauvegarde du brouillon...', formData)
    alert('Bordereau sauvegardé en brouillon')
  }

  const handleSubmit = () => {
    if (completedSections.length === 4) {
      console.log('Soumission du formulaire...', formData)
      alert('Bordereau créé avec succès !')
      // Notification à l'admin pour nouveau BSD
      const admin = allUsers?.find(u => u.role === 'Admin')
      if (admin) {
        sendNotification({
          userId: admin.id,
          type: 'waste_form_signed',
          title: 'Nouveau BSD créé',
          message: `Un nouveau bordereau de suivi des déchets a été créé par ${formData.producer_name}.`,
          entityType: 'waste_form',
          metadata: { producer: formData.producer_name, waste: formData.waste_description }
        })
      }
      navigate('/waste-forms')
    } else {
      alert('Veuillez compléter toutes les sections')
    }
  }

  // Signature canvas functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-2 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/waste-forms')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nouveau Bordereau BSD</h1>
            <p className="text-sm text-gray-300">
              Complétez les 4 sections pour créer un bordereau de suivi
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveDraft}
          className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </button>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          {sections.map((section, index) => {
            const Icon = section.icon
            const isActive = currentSection === section.id
            const isCompleted = completedSections.includes(section.id)
            
            return (
              <div key={section.id} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentSection(section.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? `bg-${section.color}-50 border-2 border-${section.color}-500` : 
                    isCompleted ? 'bg-green-50' : 
                    'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500' : 
                    isActive ? `bg-${section.color}-500` : 
                    'bg-gray-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <Icon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {section.title}
                  </span>
                </button>
                {index < sections.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${
                    completedSections.includes(sections[index + 1].id) ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Section A: Producteur */}
        {currentSection === 'A' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">Section A - Producteur du déchet</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'établissement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.producer_name}
                  onChange={(e) => handleInputChange('producer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Usine Pharmaceutique ABC"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.producer_address}
                  onChange={(e) => handleInputChange('producer_address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Adresse complète du site producteur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° NINEA <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.producer_ninea}
                  onChange={(e) => handleInputChange('producer_ninea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="7 chiffres + lettre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du contact
                </label>
                <input
                  type="text"
                  value={formData.producer_contact}
                  onChange={(e) => handleInputChange('producer_contact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.producer_phone}
                  onChange={(e) => handleInputChange('producer_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="+221 XX XXX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.producer_email}
                  onChange={(e) => handleInputChange('producer_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-900 mb-2">Signature électronique requise</h3>
              <canvas
                ref={signatureCanvasRef}
                width={600}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full border-2 border-orange-300 rounded bg-white cursor-crosshair"
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={clearSignature}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Effacer la signature
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PenTool className="h-4 w-4" />
                  <span>Signez avec votre souris ou votre doigt</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section B: Déchet */}
        {currentSection === 'B' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-6 w-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Section B - Caractérisation du déchet</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code déchet
                </label>
                <input
                  type="text"
                  value={formData.waste_code}
                  onChange={(e) => handleInputChange('waste_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ex: 18 01 03*"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  État physique <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.waste_state}
                  onChange={(e) => handleInputChange('waste_state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="solide">Solide</option>
                  <option value="liquide">Liquide</option>
                  <option value="gazeux">Gazeux</option>
                  <option value="boues">Boues</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description du déchet <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.waste_description}
                  onChange={(e) => handleInputChange('waste_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Description détaillée du déchet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de conditionnement <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.packaging_type}
                  onChange={(e) => handleInputChange('packaging_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="benne">Benne</option>
                  <option value="citerne">Citerne</option>
                  <option value="fut">Fût</option>
                  <option value="sac">Sac</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de colis
                </label>
                <input
                  type="number"
                  value={formData.packaging_count}
                  onChange={(e) => handleInputChange('packaging_count', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité estimée <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.estimated_quantity}
                    onChange={(e) => handleInputChange('estimated_quantity', parseFloat(e.target.value))}
                    step="0.01"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <select
                    value={formData.quantity_unit}
                    onChange={(e) => handleInputChange('quantity_unit', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="tonnes">Tonnes</option>
                    <option value="kg">kg</option>
                    <option value="litres">Litres</option>
                    <option value="m3">m³</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 border-t pt-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="is_dangerous"
                    checked={formData.is_dangerous}
                    onChange={(e) => handleInputChange('is_dangerous', e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_dangerous" className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-gray-900">Déchet dangereux</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Cochez si le déchet présente un danger (toxique, inflammable, corrosif, etc.)
                    </p>
                  </label>
                </div>
              </div>

              {formData.is_dangerous && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro ONU
                    </label>
                    <input
                      type="text"
                      value={formData.un_number}
                      onChange={(e) => handleInputChange('un_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Ex: UN 2810"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Classe de danger
                    </label>
                    <input
                      type="text"
                      value={formData.hazard_class}
                      onChange={(e) => handleInputChange('hazard_class', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Ex: 6.1 - Toxique"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Section C: Transporteur */}
        {currentSection === 'C' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Section C - Transporteur</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise de transport <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.transport_company}
                  onChange={(e) => handleInputChange('transport_company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de l'entreprise"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immatriculation du véhicule <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicle_registration}
                  onChange={(e) => handleInputChange('vehicle_registration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: SN-8765-AB"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de prise en charge
                </label>
                <input
                  type="datetime-local"
                  value={formData.pickup_date}
                  onChange={(e) => handleInputChange('pickup_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du chauffeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => handleInputChange('driver_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° Permis de conduire
                </label>
                <input
                  type="text"
                  value={formData.driver_license}
                  onChange={(e) => handleInputChange('driver_license', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Signature du transporteur</h3>
              <canvas
                width={600}
                height={150}
                className="w-full border-2 border-blue-300 rounded bg-white cursor-crosshair"
              />
              <div className="mt-2 flex items-center justify-between">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Effacer la signature
                </button>
                <span className="text-sm text-gray-600">Signature lors de la prise en charge</span>
              </div>
            </div>
          </div>
        )}

        {/* Section D: Destination */}
        {currentSection === 'D' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Section D - Installation de destination</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'installation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.receiver_name}
                  onChange={(e) => handleInputChange('receiver_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Centre de Traitement EcoWaste"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.receiver_address}
                  onChange={(e) => handleInputChange('receiver_address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° NINEA
                </label>
                <input
                  type="text"
                  value={formData.receiver_ninea}
                  onChange={(e) => handleInputChange('receiver_ninea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du contact
                </label>
                <input
                  type="text"
                  value={formData.receiver_contact}
                  onChange={(e) => handleInputChange('receiver_contact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de réception
                </label>
                <input
                  type="datetime-local"
                  value={formData.reception_date}
                  onChange={(e) => handleInputChange('reception_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pesée réelle
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.actual_weight}
                    onChange={(e) => handleInputChange('actual_weight', parseFloat(e.target.value))}
                    step="0.01"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formData.weight_unit}
                    onChange={(e) => handleInputChange('weight_unit', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="tonnes">Tonnes</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Acceptation du déchet <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="acceptance"
                      value="OUI"
                      checked={formData.acceptance_status === 'OUI'}
                      onChange={(e) => handleInputChange('acceptance_status', e.target.value)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span>OUI - Accepté</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="acceptance"
                      value="PARTIEL"
                      checked={formData.acceptance_status === 'PARTIEL'}
                      onChange={(e) => handleInputChange('acceptance_status', e.target.value)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span>PARTIEL - Accepté partiellement</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="acceptance"
                      value="NON"
                      checked={formData.acceptance_status === 'NON'}
                      onChange={(e) => handleInputChange('acceptance_status', e.target.value)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500"
                    />
                    <span>NON - Refusé</span>
                  </label>
                </div>
              </div>

              {(formData.acceptance_status === 'NON' || formData.acceptance_status === 'PARTIEL') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif du refus / refus partiel <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.refusal_reason}
                    onChange={(e) => handleInputChange('refusal_reason', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Indiquez les raisons du refus"
                  />
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900 mb-2">Signature du réceptionnaire</h3>
              <canvas
                width={600}
                height={150}
                className="w-full border-2 border-green-300 rounded bg-white cursor-crosshair"
              />
              <div className="mt-2 flex items-center justify-between">
                <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Effacer la signature
                </button>
                <span className="text-sm text-gray-600">Signature lors de la réception</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t mt-8">
          <button
            onClick={handlePreviousSection}
            disabled={currentSection === 'A'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </button>

          <div className="flex gap-3">
            {currentSection !== 'D' ? (
              <button
                onClick={handleNextSection}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Créer le Bordereau
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
