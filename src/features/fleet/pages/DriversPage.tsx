import { Plus, Search, Phone, Mail, Edit, Eye, Trash2, Award, Clock, Calendar, AlertTriangle, TrendingUp, Upload, X, Paperclip, Globe, Camera, Users, Truck } from 'lucide-react'
import { formatCleanAmount } from '../../../utils/formatCleanAmount';
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { driversStore } from '../services/driversStore'
import { claimsStore } from '../services/claimsStore'
import { toast } from 'sonner'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import Textarea from '../../../components/ui/Textarea'
import { sendNotification } from '../../../shared/services/notificationService'

interface WorkingHours {
  week: string
  hours: number
  overtime: number
}

interface Accident {
  id: string
  reportNumber: string
  date: string
  type: string
  severity: string
  location?: string
  costEstimate?: number
  description?: string
}

interface IdDocumentFile {
  name: string
  size: number
  dataUrl: string
}

interface Driver {
  id: string
  role: 'Chauffeur' | 'Co-Chauffeur'
  name: string
  phone: string
  email: string
  nationality: string
  idDocumentType: 'CNI' | 'Passeport'
  idDocumentNumber: string
  idDocumentFile?: IdDocumentFile
  license: string
  licenseType: string
  licenseIssueDate: string
  licenseExpiry: string
  status: 'Disponible' | 'En opération' | 'Repos' | 'Congé'
  vehicle?: string
  hazmat: boolean
  experience: number
  joinDate: string
  weeklyHours: number
  monthlyHours: number
  overtimeHours: number
  workingHoursHistory: WorkingHours[]
  accidents: Accident[]
  lastMedicalCheckup: string
  nextMedicalCheckup: string
  performanceScore: number
  totalOperations: number
  photo?: string
  notes?: string
}

export default function DriversPage() {
    const { isAdmin, allUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isWorkingHoursModalOpen, setIsWorkingHoursModalOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const stored = driversStore.load()
      if (stored && stored.length > 0) return stored as any
    } catch (e) {}
    return [ 
      { 
        id: '1', 
        role: 'Chauffeur',
        name: 'Yao Kouamé', 
        phone: '+221 77 123 45 67', 
        email: 'yao.kouame@ivos.sn',
        nationality: 'Ivoirienne',
        idDocumentType: 'CNI',
        idDocumentNumber: 'CI-CNI-20180045',
        license: 'SN-DL-001234',
        licenseType: 'D',
        licenseIssueDate: '2018-03-15',
        licenseExpiry: '2028-06-15',
        status: 'Disponible',
        vehicle: 'SN-8765-AB',
        hazmat: true,
        experience: 8,
        joinDate: '2018-03-15',
        weeklyHours: 42,
        monthlyHours: 168,
        overtimeHours: 8,
        workingHoursHistory: [
          { week: 'S3 Jan', hours: 42, overtime: 2 },
          { week: 'S2 Jan', hours: 40, overtime: 0 },
          { week: 'S1 Jan', hours: 44, overtime: 4 },
          { week: 'S4 Déc', hours: 46, overtime: 6 },
        ],
        accidents: [
          {
            id: 's1',
            reportNumber: 'SIN-2026-0001',
            date: '2026-02-10',
            type: 'Collision',
            severity: 'Majeur',
            location: 'Dakar - Pont de l\'Émergence',
            costEstimate: 1250000,
            description: 'Collision frontale, véhicule à remorquer.'
          }
        ],
        lastMedicalCheckup: '2025-06-10',
        nextMedicalCheckup: '2026-06-10',
        performanceScore: 98,
        totalOperations: 284,
        notes: 'Chauffeur expérimenté, certifié HAZMAT depuis 2019'
      },
      { 
        id: '2', 
        role: 'Chauffeur',
        name: 'Abou Traoré', 
        phone: '+221 76 987 65 43', 
        email: 'abou.traore@ivos.sn',
        nationality: 'Sénégalaise',
        idDocumentType: 'CNI',
        idDocumentNumber: 'SN-CNI-20200567',
        license: 'SN-DL-005678',
        licenseType: 'D',
        licenseIssueDate: '2020-09-01',
        licenseExpiry: '2027-12-20',
        status: 'En opération',
        vehicle: 'SN-9876-CD',
        hazmat: false,
        experience: 5,
        joinDate: '2020-09-01',
        weeklyHours: 38,
        monthlyHours: 152,
        overtimeHours: 0,
        workingHoursHistory: [
          { week: 'S3 Jan', hours: 38, overtime: 0 },
          { week: 'S2 Jan', hours: 40, overtime: 0 },
          { week: 'S1 Jan', hours: 36, overtime: 0 },
          { week: 'S4 Déc', hours: 38, overtime: 0 },
        ],
        accidents: [],
        lastMedicalCheckup: '2025-09-15',
        nextMedicalCheckup: '2026-09-15',
        performanceScore: 95,
        totalOperations: 187,
        notes: 'Formation HAZMAT prévue pour avril 2026'
      },
      { 
        id: '3', 
        role: 'Chauffeur',
        name: 'Kouassi N\'Guessan', 
        phone: '+221 78 456 78 90', 
        email: 'kouassi.nguessan@ivos.sn',
        nationality: 'Ivoirienne',
        idDocumentType: 'Passeport',
        idDocumentNumber: 'CI-PASS-2014001',
        license: 'SN-DL-009012',
        licenseType: 'D',
        licenseIssueDate: '2014-01-10',
        licenseExpiry: '2029-03-10',
        status: 'Disponible',
        vehicle: 'SN-5432-EF',
        hazmat: true,
        experience: 12,
        joinDate: '2014-01-10',
        weeklyHours: 40,
        monthlyHours: 160,
        overtimeHours: 4,
        workingHoursHistory: [
          { week: 'S3 Jan', hours: 40, overtime: 0 },
          { week: 'S2 Jan', hours: 42, overtime: 2 },
          { week: 'S1 Jan', hours: 40, overtime: 0 },
          { week: 'S4 Déc', hours: 42, overtime: 2 },
        ],
        accidents: [],
        lastMedicalCheckup: '2025-01-20',
        nextMedicalCheckup: '2026-07-20',
        performanceScore: 97,
        totalOperations: 432,
        notes: 'Senior driver - Formateur interne certifié'
      },
    ]
  })

  // Load shared claims and associate to drivers (by driver name or vehicle)
  useEffect(() => {
    const claims = claimsStore.load()
    if (!claims || claims.length === 0) return
    setDrivers(prev => prev.map(d => {
      const matched = claims.filter(c => {
        const matchByDriver = c.driver && d.name && c.driver.toLowerCase().includes(d.name.toLowerCase())
        const matchByVehicle = c.vehicle && d.vehicle && c.vehicle.toLowerCase().includes(d.vehicle.toLowerCase())
        return matchByDriver || matchByVehicle
      }).map(c => ({
        id: c.id,
        reportNumber: c.reportNumber,
        date: c.date,
        type: c.type,
        severity: c.severity,
        location: c.location,
        costEstimate: c.costEstimate,
        description: c.description
      }))
      return { ...d, accidents: matched }
    }))
    const onUpdate = () => {
      const claimsNow = claimsStore.load()
      setDrivers(prev => prev.map(d => ({
        ...d,
        accidents: claimsNow.filter(c => {
          const matchByDriver = c.driver && d.name && c.driver.toLowerCase().includes(d.name.toLowerCase())
          const matchByVehicle = c.vehicle && d.vehicle && c.vehicle.toLowerCase().includes(d.vehicle.toLowerCase())
          return matchByDriver || matchByVehicle
        }).map(c => ({
          id: c.id,
          reportNumber: c.reportNumber,
          date: c.date,
          type: c.type,
          severity: c.severity,
          location: c.location,
          costEstimate: c.costEstimate,
          description: c.description
        }))
      })))
    }

    window.addEventListener('claims:updated', onUpdate)
    return () => window.removeEventListener('claims:updated', onUpdate)
  }, [])

  const [filterRole, setFilterRole] = useState('all')

  const [formData, setFormData] = useState({
    role: 'Chauffeur' as Driver['role'],
    name: '',
    phone: '',
    email: '',
    nationality: '',
    idDocumentType: 'CNI' as Driver['idDocumentType'],
    idDocumentNumber: '',
    license: '',
    licenseType: '',
    licenseIssueDate: '',
    licenseExpiry: '',
    status: 'Disponible' as Driver['status'],
    vehicle: '',
    hazmat: false,
    experience: 0,
    joinDate: '',
    weeklyHours: 40,
    monthlyHours: 160,
    overtimeHours: 0,
    lastMedicalCheckup: '',
    nextMedicalCheckup: '',
    performanceScore: 100,
    totalOperations: 0,
    notes: ''
  })
  const [idDocFile, setIdDocFile] = useState<IdDocumentFile | undefined>(undefined)
  const idFileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('Photo trop volumineuse (max 20 Mo)'); return }
    const reader = new FileReader()
    reader.onload = () => { setPhotoPreview(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 Mo)'); return }
    const reader = new FileReader()
    reader.onload = () => { setIdDocFile({ name: file.name, size: file.size, dataUrl: reader.result as string }) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' o' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' Ko' : (bytes / 1048576).toFixed(1) + ' Mo'

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.license.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || driver.status === filterStatus
    const matchesRole = filterRole === 'all' || driver.role === filterRole
    
    return matchesSearch && matchesStatus && matchesRole
  })

  // Calcul des alertes
  const getDriverAlerts = (driver: Driver) => {
    const alerts = []
    const now = new Date()
    
    // Alerte permis
    const licenseDate = new Date(driver.licenseExpiry)
    const daysTillLicense = Math.ceil((licenseDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    if (daysTillLicense <= 60 && daysTillLicense > 0) {
      alerts.push({ type: 'license', days: daysTillLicense, priority: daysTillLicense <= 30 ? 'high' : 'medium' })
    } else if (daysTillLicense <= 0) {
      alerts.push({ type: 'license', days: daysTillLicense, priority: 'critical' })
    } else {
      alerts.push({ type: 'license', days: daysTillLicense, priority: 'medium' })
    }
    
    // Alerte visite médicale
    const medicalDate = new Date(driver.nextMedicalCheckup)
    const daysTillMedical = Math.ceil((medicalDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    if (daysTillMedical <= 30 && daysTillMedical > 0) {
      alerts.push({ type: 'medical', days: daysTillMedical, priority: daysTillMedical <= 15 ? 'high' : 'medium' })
    } else if (daysTillMedical <= 0) {
      alerts.push({ type: 'medical', days: daysTillMedical, priority: 'critical' })
    } else {
      alerts.push({ type: 'medical', days: daysTillMedical, priority: 'medium' })
    }
    
    // Alerte heures supplémentaires
    if (driver.overtimeHours > 15) {
      alerts.push({ type: 'overtime', days: 0, priority: 'medium' })
    }
    
    // Alerte temps de travail hebdomadaire
    if (driver.weeklyHours > 48) {
      alerts.push({ type: 'hours', days: 0, priority: 'high' })
    }
    
    return alerts
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : 
              ['experience', 'weeklyHours', 'monthlyHours', 'overtimeHours', 'performanceScore', 'totalOperations'].includes(name) 
                ? parseInt(value) || 0 
                : value
    }))
  }

  const resetForm = () => {
    setFormData({
      role: 'Chauffeur',
      name: '',
      phone: '',
      email: '',
      nationality: '',
      idDocumentType: 'CNI',
      idDocumentNumber: '',
      license: '',
      licenseType: '',
      licenseIssueDate: '',
      licenseExpiry: '',
      status: 'Disponible',
      vehicle: '',
      hazmat: false,
      experience: 0,
      joinDate: '',
      weeklyHours: 40,
      monthlyHours: 160,
      overtimeHours: 0,
      lastMedicalCheckup: '',
      nextMedicalCheckup: '',
      performanceScore: 100,
      totalOperations: 0,
      notes: ''
    })
    setIdDocFile(undefined)
    setPhotoPreview(undefined)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const newDriver: Driver = {
      id: Date.now().toString(),
      ...formData,
      photo: photoPreview,
      idDocumentFile: idDocFile,
      workingHoursHistory: [],
      accidents: []
    }
    setDrivers([...drivers, newDriver])
    setIsCreateModalOpen(false)
    resetForm()
    toast.success('Créé avec succès')
    // Notification au chauffeur si trouvé
    const driverUser = allUsers.find((u: { fullName: string }) => u.fullName === newDriver.name)
    if (driverUser) {
      sendNotification({
        userId: driverUser.id,
        type: 'other',
        title: 'Nouveau compte chauffeur',
        message: `Un nouveau compte chauffeur a été créé pour ${newDriver.name}.`,
        entityType: 'driver',
        entityId: newDriver.id,
        metadata: { driver: newDriver.name }
      })
    }
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDriver) return
    
    setDrivers(drivers.map(d => 
      d.id === selectedDriver.id ? { 
        ...d, 
        ...formData,
        photo: photoPreview,
        idDocumentFile: idDocFile,
        workingHoursHistory: selectedDriver.workingHoursHistory 
      } : d
    ))
    setIsEditModalOpen(false)
    setSelectedDriver(null)
    resetForm()
    toast.success('Modifié avec succès')
    // Correction : définir user ou remplacer par l'utilisateur courant
    // sendNotification({ userId: currentUser.id, ... })
  }

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ?')) {
      setDrivers(drivers.filter(d => d.id !== id))
      setIsEditModalOpen(false)
      setSelectedDriver(null)
      toast.success('Supprimé avec succès')
      // Correction : définir user ou remplacer par l'utilisateur courant
      // sendNotification({ userId: currentUser.id, ... })
    }
  }

  const openEditModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setFormData({
      role: driver.role,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      nationality: driver.nationality,
      idDocumentType: driver.idDocumentType,
      idDocumentNumber: driver.idDocumentNumber,
      license: driver.license,
      licenseType: driver.licenseType,
      licenseIssueDate: driver.licenseIssueDate,
      licenseExpiry: driver.licenseExpiry,
      status: driver.status,
      vehicle: driver.vehicle || '',
      hazmat: driver.hazmat,
      experience: driver.experience,
      joinDate: driver.joinDate,
      weeklyHours: driver.weeklyHours,
      monthlyHours: driver.monthlyHours,
      overtimeHours: driver.overtimeHours,
      lastMedicalCheckup: driver.lastMedicalCheckup,
      nextMedicalCheckup: driver.nextMedicalCheckup,
      performanceScore: driver.performanceScore,
      totalOperations: driver.totalOperations,
      notes: driver.notes || ''
    })
    setIdDocFile(driver.idDocumentFile)
    setPhotoPreview(driver.photo)
    setIsEditModalOpen(true)
  }

  const openViewModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setIsViewModalOpen(true)
  }

  const openWorkingHoursModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setIsWorkingHoursModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible':
        return 'bg-green-100 text-green-800'
      case 'En opération':
        return 'bg-blue-100 text-blue-800'
      case 'Repos':
        return 'bg-gray-100 text-gray-800'
      case 'Congé':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 95) return 'text-green-600'
    if (score >= 85) return 'text-blue-600'
    if (score >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Truck className="w-7 h-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chauffeurs et Co-Chauffeurs</h1>
            <p className="text-sm text-gray-300">Équipe de conducteurs — Temps de travail & Performance</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all shadow-md"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-200"
              placeholder="Rechercher un chauffeur..."
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-200"
          >
            <option value="all">Tous les rôles</option>
            <option value="Chauffeur">Chauffeur</option>
            <option value="Co-Chauffeur">Co-Chauffeur</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-200"
          >
            <option value="all">Tous les statuts</option>
            <option value="Disponible">Disponible</option>
            <option value="En opération">En opération</option>
            <option value="Repos">Repos</option>
            <option value="Congé">Congé</option>
          </select>
        </div>
      </div>

      {/* Drivers Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white shadow-md rounded-2xl p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">{searchTerm || filterRole !== 'all' || filterStatus !== 'all' ? 'Aucun chauffeur ne correspond à votre recherche' : 'Aucun chauffeur enregistré'}</p>
          <p className="text-gray-400 text-sm mt-1">{searchTerm || filterRole !== 'all' || filterStatus !== 'all' ? 'Essayez de modifier vos filtres' : 'Commencez par ajouter un chauffeur'}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDrivers.map((driver) => {
          const alerts = getDriverAlerts(driver)
          return (
            <div key={driver.id} className="bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200">
              <div className="p-6">
                {/* Driver Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {driver.photo ? (
                        <img src={driver.photo} alt={driver.name} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold text-blue-600">
                          {driver.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
                      <p className="text-xs text-gray-500">{driver.license}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(driver.status)}`}>
                      {driver.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${driver.role === 'Chauffeur' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>
                      {driver.role}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {driver.hazmat && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 inline-flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      HAZMAT
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 ${getPerformanceColor(driver.performanceScore)}`}>
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    Score: {driver.performanceScore}%
                    </span>
                  {driver.accidents && driver.accidents.length > 0 && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {driver.accidents.length} sinistre{driver.accidents.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {driver.totalOperations} opérations
                  </span>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {alerts.slice(0, 2).map((alert, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${
                          alert.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          {alert.type === 'license' ? 'Permis' : 
                           alert.type === 'medical' ? 'Visite médicale' : 
                           alert.type === 'overtime' ? 'Heures sup. élevées' :
                           'Dépassement horaire'} 
                          {alert.days > 0 ? ` - ${alert.days}j` : alert.days < 0 ? ' - EXPIRÉ!' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Working Hours */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Temps de travail</span>
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{driver.weeklyHours}h</p>
                      <p className="text-xs text-gray-600">Semaine</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{driver.monthlyHours}h</p>
                      <p className="text-xs text-gray-600">Mois</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{driver.overtimeHours}h</p>
                      <p className="text-xs text-gray-600">H. Sup.</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span className="truncate">{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                  {driver.vehicle && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Véhicule: {driver.vehicle}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="h-4 w-4" />
                    <span>{driver.nationality}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button 
                    onClick={() => openWorkingHoursModal(driver)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center justify-center gap-1"
                  >
                    <Clock className="h-4 w-4" />
                    Horaires
                  </button>
                  <button 
                    onClick={() => openViewModal(driver)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => openEditModal(driver)}
                    className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm() }} title="Nouveau Chauffeur / Co-Chauffeur" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Photo de profil */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                {photoPreview ? (
                  <img src={photoPreview} alt="Photo" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => photoInputRef.current?.click()} className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
                <Upload className="h-4 w-4 inline mr-1" />Choisir une photo
              </button>
              {photoPreview && (
                <button type="button" onClick={() => setPhotoPreview(undefined)} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100">
                  <X className="h-4 w-4 inline mr-1" />Supprimer
                </button>
              )}
              <p className="text-xs text-gray-500">JPG, PNG (max 20 Mo)</p>
            </div>
          </div>
          <Select
            label="Rôle"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            options={[
              { value: 'Chauffeur', label: 'Chauffeur' },
              { value: 'Co-Chauffeur', label: 'Co-Chauffeur' },
            ]}
            required
          />
          <Input
            label="Nom complet"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Ex: Yao Kouamé"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Téléphone (Sénégal)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+221 XX XXX XX XX"
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@ivos.sn"
              required
            />
          </div>

          {/* Nationalité & Pièce d'identité */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">🌍 Nationalité & Pièce d'identité</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Nationalité" name="nationality" value={formData.nationality} onChange={handleInputChange} placeholder="Sénégalaise" required />
              <Select label="Type de pièce" name="idDocumentType" value={formData.idDocumentType} onChange={handleInputChange} options={[
                { value: 'CNI', label: "Carte Nationale d'Identité" },
                { value: 'Passeport', label: 'Passeport' },
              ]} required />
              <Input label="N° de pièce" name="idDocumentNumber" value={formData.idDocumentNumber} onChange={handleInputChange} placeholder="SN-CNI-XXXXXXXX" required />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Scan / Photo de la pièce</label>
              <input ref={idFileInputRef} type="file" accept="image/*,.pdf" onChange={handleIdFileUpload} className="hidden" />
              {idDocFile ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{idDocFile.name}</span>
                    <span className="text-xs text-green-600">({formatFileSize(idDocFile.size)})</span>
                  </div>
                  <button type="button" onClick={() => setIdDocFile(undefined)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => idFileInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />Cliquer pour uploader (max 20 Mo)
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <Input
              label="N° Permis (SN)"
              name="license"
              value={formData.license}
              onChange={handleInputChange}
              placeholder="SN-DL-XXXXXX"
              required
            />
            <Select
              label="Type de permis"
              name="licenseType"
              value={formData.licenseType}
              onChange={handleInputChange}
              options={[
                { value: 'A', label: 'Catégorie A' },
                { value: 'B', label: 'Catégorie B' },
                { value: 'C', label: 'Catégorie C' },
                { value: 'C+E', label: 'Catégorie C+E' },
                { value: 'D', label: 'Catégorie D' },
                { value: 'D+E', label: 'Catégorie D+E' }
              ]}
              required
            />
            <Input
              label="Date délivrance"
              name="licenseIssueDate"
              type="date"
              value={formData.licenseIssueDate}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Expiration permis"
              name="licenseExpiry"
              type="date"
              value={formData.licenseExpiry}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Années d'expérience"
              name="experience"
              type="number"
              value={formData.experience}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date d'embauche"
              name="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Dernière visite médicale"
              name="lastMedicalCheckup"
              type="date"
              value={formData.lastMedicalCheckup}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Prochaine visite médicale"
              name="nextMedicalCheckup"
              type="date"
              value={formData.nextMedicalCheckup}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Heures hebdomadaires"
              name="weeklyHours"
              type="number"
              value={formData.weeklyHours}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Heures mensuelles"
              name="monthlyHours"
              type="number"
              value={formData.monthlyHours}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Heures supplémentaires"
              name="overtimeHours"
              type="number"
              value={formData.overtimeHours}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Statut"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'Disponible', label: 'Disponible' },
                { value: 'En opération', label: 'En opération' },
                { value: 'Repos', label: 'Repos' },
                { value: 'Congé', label: 'Congé' }
              ]}
              required
            />
            <Input
              label="Véhicule assigné"
              name="vehicle"
              value={formData.vehicle}
              onChange={handleInputChange}
              placeholder="SN-XXXX-XX (optionnel)"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hazmat"
              name="hazmat"
              checked={formData.hazmat}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="hazmat" className="text-sm font-medium text-gray-700">
              Certification HAZMAT (Matières Dangereuses)
            </label>
          </div>
          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Informations complémentaires..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForm() }}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal - Similar structure to Create Modal but with edit logic */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedDriver(null); resetForm() }} title="Modifier Chauffeur / Co-Chauffeur" size="xl">
        <form onSubmit={handleEdit} className="space-y-4">
          {/* Photo de profil */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                {photoPreview ? (
                  <img src={photoPreview} alt="Photo" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => photoInputRef.current?.click()} className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
                <Upload className="h-4 w-4 inline mr-1" />Choisir une photo
              </button>
              {photoPreview && (
                <button type="button" onClick={() => setPhotoPreview(undefined)} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100">
                  <X className="h-4 w-4 inline mr-1" />Supprimer
                </button>
              )}
              <p className="text-xs text-gray-500">JPG, PNG (max 20 Mo)</p>
            </div>
          </div>
          {/* Same fields as Create Modal */}
          <Select label="Rôle" name="role" value={formData.role} onChange={handleInputChange} options={[
            { value: 'Chauffeur', label: 'Chauffeur' },
            { value: 'Co-Chauffeur', label: 'Co-Chauffeur' },
          ]} required />
          <Input label="Nom complet" name="name" value={formData.name} onChange={handleInputChange} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Téléphone (Sénégal)" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
          </div>

          {/* Nationalité & Pièce d'identité */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">🌍 Nationalité & Pièce d'identité</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Nationalité" name="nationality" value={formData.nationality} onChange={handleInputChange} placeholder="Sénégalaise" required />
              <Select label="Type de pièce" name="idDocumentType" value={formData.idDocumentType} onChange={handleInputChange} options={[
                { value: 'CNI', label: "Carte Nationale d'Identité" },
                { value: 'Passeport', label: 'Passeport' },
              ]} required />
              <Input label="N° de pièce" name="idDocumentNumber" value={formData.idDocumentNumber} onChange={handleInputChange} placeholder="SN-CNI-XXXXXXXX" required />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Scan / Photo de la pièce</label>
              <input ref={idFileInputRef} type="file" accept="image/*,.pdf" onChange={handleIdFileUpload} className="hidden" />
              {idDocFile ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{idDocFile.name}</span>
                    <span className="text-xs text-green-600">({formatFileSize(idDocFile.size)})</span>
                  </div>
                  <button type="button" onClick={() => setIdDocFile(undefined)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => idFileInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />Cliquer pour uploader (max 20 Mo)
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <Input label="N° Permis (SN)" name="license" value={formData.license} onChange={handleInputChange} required />
            <Select
              label="Type de permis"
              name="licenseType"
              value={formData.licenseType}
              onChange={handleInputChange}
              options={[
                { value: 'A', label: 'Catégorie A' },
                { value: 'B', label: 'Catégorie B' },
                { value: 'C', label: 'Catégorie C' },
                { value: 'C+E', label: 'Catégorie C+E' },
                { value: 'D', label: 'Catégorie D' },
                { value: 'D+E', label: 'Catégorie D+E' }
              ]}
              required
            />
            <Input label="Date délivrance" name="licenseIssueDate" type="date" value={formData.licenseIssueDate} onChange={handleInputChange} required />
            <Input label="Expiration permis" name="licenseExpiry" type="date" value={formData.licenseExpiry} onChange={handleInputChange} required />
            <Input label="Années d'expérience" name="experience" type="number" value={formData.experience} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date d'embauche" name="joinDate" type="date" value={formData.joinDate} onChange={handleInputChange} required />
            <Input label="Dernière visite médicale" name="lastMedicalCheckup" type="date" value={formData.lastMedicalCheckup} onChange={handleInputChange} required />
            <Input label="Prochaine visite médicale" name="nextMedicalCheckup" type="date" value={formData.nextMedicalCheckup} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Heures hebdomadaires" name="weeklyHours" type="number" value={formData.weeklyHours} onChange={handleInputChange} required />
            <Input label="Heures mensuelles" name="monthlyHours" type="number" value={formData.monthlyHours} onChange={handleInputChange} required />
            <Input label="Heures supplémentaires" name="overtimeHours" type="number" value={formData.overtimeHours} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Statut"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'Disponible', label: 'Disponible' },
                { value: 'En opération', label: 'En opération' },
                { value: 'Repos', label: 'Repos' },
                { value: 'Congé', label: 'Congé' }
              ]}
              required
            />
            <Input label="Véhicule assigné" name="vehicle" value={formData.vehicle} onChange={handleInputChange} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="hazmat-edit" name="hazmat" checked={formData.hazmat} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="hazmat-edit" className="text-sm font-medium text-gray-700">Certification HAZMAT</label>
          </div>
          <Textarea label="Notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsEditModalOpen(false); setSelectedDriver(null); resetForm() }}>Annuler</Button>
            {isAdmin && (
              <Button variant="danger" onClick={() => { if (selectedDriver) handleDelete(selectedDriver.id) }}>
                <Trash2 className="h-4 w-4 mr-2" />Supprimer
              </Button>
            )}
            <Button type="submit" variant="primary">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setSelectedDriver(null) }} title="Détails du Chauffeur" size="lg">
        {selectedDriver && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {selectedDriver.photo ? (
                    <img src={selectedDriver.photo} alt={selectedDriver.name} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-blue-600">
                      {selectedDriver.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedDriver.name}</h3>
                  <p className="text-gray-600">{selectedDriver.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedDriver.role === 'Chauffeur' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>
                      {selectedDriver.role}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDriver.status)}`}>
                      {selectedDriver.status}
                    </span>
                    {selectedDriver.hazmat && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 inline-flex items-center gap-1">
                        <Award className="h-3 w-3" />Certifié HAZMAT
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 ${getPerformanceColor(selectedDriver.performanceScore)}`}>
                      Score: {selectedDriver.performanceScore}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
              <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Téléphone</p><p className="font-medium text-gray-900">{selectedDriver.phone}</p></div>
              <div><p className="text-sm text-gray-500">Permis</p><p className="font-medium text-gray-900">{selectedDriver.license}</p></div>
              <div><p className="text-sm text-gray-500">Type de permis</p><p className="font-medium text-gray-900">{selectedDriver.licenseType || 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Expiration permis</p><p className="font-medium text-gray-900">{new Date(selectedDriver.licenseExpiry).toLocaleDateString('fr-FR')}</p></div>
              <div><p className="text-sm text-gray-500">Expérience</p><p className="font-medium text-gray-900">{selectedDriver.experience} ans</p></div>
              <div><p className="text-sm text-gray-500">Date d'embauche</p><p className="font-medium text-gray-900">{new Date(selectedDriver.joinDate).toLocaleDateString('fr-FR')}</p></div>
              <div><p className="text-sm text-gray-500">Véhicule assigné</p><p className="font-medium text-gray-900">{selectedDriver.vehicle || 'Non assigné'}</p></div>
              <div><p className="text-sm text-gray-500">Total opérations</p><p className="font-medium text-gray-900">{selectedDriver.totalOperations}</p></div>
              <div><p className="text-sm text-gray-500">Prochaine visite médicale</p><p className="font-medium text-gray-900">{new Date(selectedDriver.nextMedicalCheckup).toLocaleDateString('fr-FR')}</p></div>
            </div>

            {/* Nationalité & Pièce d'identité */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">🌍 Nationalité & Pièce d'identité</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Nationalité</p><p className="font-medium text-gray-900">{selectedDriver.nationality}</p></div>
                <div><p className="text-gray-500">Type de pièce</p><p className="font-medium text-gray-900">{selectedDriver.idDocumentType === 'CNI' ? "Carte Nationale d'Identité" : 'Passeport'}</p></div>
                <div><p className="text-gray-500">N° de pièce</p><p className="font-medium text-gray-900">{selectedDriver.idDocumentNumber}</p></div>
                {selectedDriver.idDocumentFile && (
                  <div><p className="text-gray-500">Fichier joint</p><a href={selectedDriver.idDocumentFile.dataUrl} download={selectedDriver.idDocumentFile.name} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"><Paperclip className="h-4 w-4" />{selectedDriver.idDocumentFile.name}</a></div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Temps de travail</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold text-gray-900">{selectedDriver.weeklyHours}h</p><p className="text-xs text-gray-600">Hebdomadaire</p></div>
                <div><p className="text-2xl font-bold text-gray-900">{selectedDriver.monthlyHours}h</p><p className="text-xs text-gray-600">Mensuel</p></div>
                <div><p className="text-2xl font-bold text-orange-600">{selectedDriver.overtimeHours}h</p><p className="text-xs text-gray-600">Heures sup.</p></div>
              </div>
            </div>

            {selectedDriver.accidents && selectedDriver.accidents.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Sinistres impliquant ce chauffeur</p>
                <div className="space-y-3">
                  {selectedDriver.accidents.map((acc, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-gray-900">{acc.reportNumber} — {acc.type}</div>
                        <div className="text-xs text-gray-500">{new Date(acc.date).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div className="text-gray-600 text-sm">Lieu: {acc.location || '—'}</div>
                      <div className="text-gray-600 text-sm">Sévérité: {acc.severity}</div>
                      <div className="text-gray-600 text-sm">Coût estimé: {acc.costEstimate ? formatCleanAmount(acc.costEstimate, 'FCFA') : '—'}</div>
                      {acc.description && <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded">{acc.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedDriver.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Notes</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDriver.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setIsViewModalOpen(false); setSelectedDriver(null) }}>Fermer</Button>
              <Button variant="primary" onClick={() => { setIsViewModalOpen(false); openEditModal(selectedDriver) }}>
                <Edit className="h-4 w-4 mr-2" />Modifier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Working Hours History Modal */}
      <Modal isOpen={isWorkingHoursModalOpen} onClose={() => { setIsWorkingHoursModalOpen(false); setSelectedDriver(null) }} title="Historique des Heures" size="lg">
        {selectedDriver && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedDriver.name}</h3>
              <p className="text-sm text-gray-600">Suivi du temps de travail</p>
            </div>

            <div className="space-y-3">
              {selectedDriver.workingHoursHistory.map((record, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">{record.week}</h4>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{record.hours + record.overtime}h total</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Heures normales:</span> <span className="font-medium text-gray-900">{record.hours}h</span></div>
                    <div><span className="text-gray-500">Heures sup.:</span> <span className="font-medium text-orange-600">{record.overtime}h</span></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setIsWorkingHoursModalOpen(false); setSelectedDriver(null) }}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
