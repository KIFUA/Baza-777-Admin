export enum Gender {
  MALE = 'брат',
  FEMALE = 'сестра'
}

export interface LookupItem {
  id: number;
  value: string;
}

export interface Spouse {
  id: number;
  pib: string;
}

export interface Child {
  id: number;
  name: string;
  birthDate?: string;
  birthDateExcel?: number;
  age: number;
  familyId: number;
  fatherId?: number;
  motherId?: number;
}

export interface MinistryRecord {
  id: number;
  memberId: number;
  ministryId: number;
  ministryName: string;
  startDate?: string;
  startDateExcel?: number;
  endDate?: string;
  endDateExcel?: number;
  isActive: boolean;
}

export interface DisciplineRecord {
  id: number;
  memberId: number;
  disciplineId: number;
  disciplineName: string;
  reason: string;
  startDate?: string;
  startDateExcel?: number;
  endDate?: string;
  endDateExcel?: number;
  removalDate?: string;
  removalDateExcel?: number;
  isActive: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  memberId: number;
  memberName: string;
  action: string; // 'create' | 'update' | 'dismiss' | 'discipline' | 'add_ministry'
  details: string;
  userPib?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export interface Member {
  id: number;
  pib: string;
  gender?: string; // 'брат' | 'сестра' | etc.
  stat?: string;  // backwards compatibility
  
  // Demographics & Statuses
  s_simeyniy_ukr: string;
  id_simeyniy: number;
  s_socialniy_ukr: string;
  id_socialniy: number;
  s_osvita_ukr: string;
  id_osvita: number;
  s_profesiya_ukr: string;
  id_profesiya: number;
  s_slujinnya_spysok?: string;
  zaklad_osv: string;
  
  d_narodjennya?: string; // formatted date (YYYY-MM-DD)
  d_narodjennya_excel?: number;
  tel_mob: string;
  tel1: string;
  skype: string;
  email?: string;
  vik_rokiv1?: number; // age in years
  
  // Spiritual details
  d_pokayannya?: string;
  d_pokayannya_excel?: number;
  d_vodnogo?: string;
  d_vodnogo_excel?: number;
  hsd: boolean; // has spiritual gift/is helper
  d_vstupu?: string;
  d_vstupu_excel?: number;
  
  // Custom Characteristics (Attendance & Prep)
  vidviduvanist: string; // Attendance characteristic (user request 8)
  prysutnist: string;    // Presence characteristic (user request 9)
  
  // Care (Opika) & Area
  presviter: string; // Caretaker/pastor responsible
  rayon2_ukr: string; // Structural Area: "АЕРОПОРТ", "ЦЕНТР", "КАСКАД", etc.
  id_rayon2: number | string;
  id_dilnytsia?: number | string;
  id_dilnicya?: number | string; // backwards compatibility
  n_dilyci: string; // "Дільниця №1"
  vidpov_grupy: string; // Group representative
  
  // Leaving/Discharge details
  id_vybuttya: number;
  s_vybuv_ukr: string;
  d_vybuttya?: string;
  d_vybuttya_excel?: number;
  vybutty_prymitka: string; // specific reasons: "куди" for відп/емігр; "за що" for вилуч
  
  hvoryi: string;
  insha_gromada: string;
  prymitka?: string;
  d_kontaktiv?: string; // presbyter contact dates migrated from Church Management CSS spreadsheet
  di_admin?: string;
  efile?: boolean | number;
  address?: string;
  nas_punkt?: string;
  vulitsya?: string;
  budynok?: string;
  korpus?: string;
  kvartyra?: string;
  d_shlyubu?: string;
  pib_partnera?: string;
  dity?: string;
  sluj_uchast?: string;
  discipline?: string;
  discipline_date_start?: string;
  discipline_date_end?: string;
}

export interface MemberDetailExtended {
  member: Member;
  spouse: Spouse | null;
  children: Child[];
  ministries: MinistryRecord[];
  disciplines: DisciplineRecord[];
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  dismissedMembers: number;
  malesCount: number;
  femalesCount: number;
  maritalStats: Record<string, number>;
  socialStats: Record<string, number>;
  educationStats: Record<string, number>;
  areaStats: Record<string, number>;
  groupsCount: Record<string, number>;
  caregiversCount: Record<string, number>;
}
