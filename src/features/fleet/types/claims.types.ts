export type Claim = {
  id: string
  reportNumber: string
  date: string
  vehicle: string
  driver: string
  type: string
  severity: string
  location?: string
  insurer?: string
  status: string
  costEstimate?: number
  description?: string
  thirdPartyInsurer?: string
  thirdPartyContactName?: string
  thirdPartyContactPhone?: string
  thirdPartyContactEmail?: string
  accidentPhotos?: string[]
  source?: 'parc' | 'personnel'
  nature?: string
  insuranceDossierNumber?: string
  constatScan?: string
}
