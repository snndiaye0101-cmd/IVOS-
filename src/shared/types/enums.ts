// ============================================
// Types d'énumérations globaux
// ============================================

// Rôles utilisateur
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COUNTRY_MANAGER = 'country_manager',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  CLIENT = 'client',
  SUPERVISOR = 'supervisor',
}

// Statuts utilisateur
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// Types de véhicule
export enum VehicleType {
  TRUCK = 'truck',
  VAN = 'van',
  TANKER = 'tanker',
  TRAILER = 'trailer',
  COMPACTOR = 'compactor',
  OTHER = 'other',
}

// Statuts véhicule
export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_MISSION = 'in_mission',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service',
}

// Statuts chauffeur
export enum DriverStatus {
  AVAILABLE = 'available',
  ON_MISSION = 'on_mission',
  OFF_DUTY = 'off_duty',
  SUSPENDED = 'suspended',
}

// Types de client
export enum ClientType {
  PRODUCER = 'producer',
  RECEIVER = 'receiver',
  BOTH = 'both',
}

// Statuts d'opération
export enum OperationStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// Types d'opération
export enum OperationType {
  WASTE_COLLECTION = 'waste_collection',
  DELIVERY = 'delivery',
  TRANSFER = 'transfer',
  OTHER = 'other',
}

// États du déchet
export enum WasteState {
  GASEOUS = 'gaseous',
  LIQUID = 'liquid',
  SOLID = 'solid',
  SLUDGE = 'sludge',
  MIXED = 'mixed',
}

// Types de conditionnement
export enum PackagingType {
  SKIP = 'skip',
  TANKER = 'tanker',
  DRUM = 'drum',
  BAG = 'bag',
  BULK = 'bulk',
  CONTAINER = 'container',
  OTHER = 'other',
}

// Statut d'acceptation
export enum AcceptanceStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PARTIAL = 'partial',
}

// Catégories de document
export enum DocumentCategory {
  VEHICLE_REGISTRATION = 'vehicle_registration',
  INSURANCE = 'insurance',
  DRIVER_LICENSE = 'driver_license',
  WASTE_MANIFEST = 'waste_manifest',
  DELIVERY_NOTE = 'delivery_note',
  PHOTO = 'photo',
  OTHER = 'other',
}

// Types de notification
export enum NotificationType {
  OPERATION_ASSIGNED = 'operation_assigned',
  OPERATION_COMPLETED = 'operation_completed',
  DOCUMENT_EXPIRING = 'document_expiring',
  WASTE_FORM_SIGNED = 'waste_form_signed',
  MAINTENANCE_DUE = 'maintenance_due',
  OTHER = 'other',
}

// Labels pour affichage UI
export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Administrateur Global',
  [UserRole.COUNTRY_MANAGER]: 'Manager Pays',
  [UserRole.DISPATCHER]: 'Dispatcher',
  [UserRole.DRIVER]: 'Chauffeur',
  [UserRole.CLIENT]: 'Client',
  [UserRole.SUPERVISOR]: 'Superviseur',
};

export const VehicleStatusLabels: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: 'Disponible',
  [VehicleStatus.IN_MISSION]: 'En Operation',
  [VehicleStatus.MAINTENANCE]: 'Maintenance',
  [VehicleStatus.OUT_OF_SERVICE]: 'Hors Service',
};

export const OperationStatusLabels: Record<OperationStatus, string> = {
  [OperationStatus.DRAFT]: 'Brouillon',
  [OperationStatus.VALIDATED]: 'Validé',
  [OperationStatus.IN_PROGRESS]: 'En Cours',
  [OperationStatus.COMPLETED]: 'Terminé',
  [OperationStatus.CLOSED]: 'Clôturé',
  [OperationStatus.CANCELLED]: 'Annulé',
};

export const WasteStateLabels: Record<WasteState, string> = {
  [WasteState.GASEOUS]: 'Gazeux',
  [WasteState.LIQUID]: 'Liquide',
  [WasteState.SOLID]: 'Solide',
  [WasteState.SLUDGE]: 'Boues',
  [WasteState.MIXED]: 'Mixte',
};

export const PackagingTypeLabels: Record<PackagingType, string> = {
  [PackagingType.SKIP]: 'Benne',
  [PackagingType.TANKER]: 'Citerne',
  [PackagingType.DRUM]: 'Fût',
  [PackagingType.BAG]: 'Sac',
  [PackagingType.BULK]: 'Vrac',
  [PackagingType.CONTAINER]: 'Conteneur',
  [PackagingType.OTHER]: 'Autre',
};

export const AcceptanceStatusLabels: Record<AcceptanceStatus, string> = {
  [AcceptanceStatus.PENDING]: 'En Attente',
  [AcceptanceStatus.ACCEPTED]: 'Accepté',
  [AcceptanceStatus.REJECTED]: 'Refusé',
  [AcceptanceStatus.PARTIAL]: 'Partiel',
};
