export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ──────────────────────────────────────────────────────
export type AccountRole       = 'doctor' | 'clinic' | 'admin'
export type ShiftStatus       = 'open' | 'filled' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type ShiftCategory     = 'guardia' | 'consultorio' | 'ambulancia' | 'otro'

// ── Table row types ────────────────────────────────────────────
export interface Account {
  id:          string
  role:        AccountRole
  email:       string
  full_name:   string
  phone:       string | null
  whatsapp:    string | null    // solo accesible desde server post-aceptación
  avatar_url:  string | null
  cover_url:   string | null
  verified_at: string | null    // solo admin puede setear
  deleted_at:  string | null
  created_at:  string
  updated_at:  string
}

export interface DoctorProfile {
  id:                 string
  dni:                string | null
  matricula:          string | null
  cuit:               string | null
  specialty:          string[]   // declaradas por el médico
  specialty_verified: string[]   // validadas por admin (subconjunto de specialty)
  birth_date:         string | null
  university:         string | null
  bio:                string | null
  experience_tags:    string[]
  location_maps:      string | null
  km_from_cba:        number | null
  blocked_dates:      string[]
  rating:             number
  reviews_count:      number
}

export interface ClinicProfile {
  id:            string
  cuit:          string | null
  admin_name:    string | null
  provider_type: string | null
  address:       string | null
  location_maps: string | null
  complexity:    string[]
  num_doctors:   number | null
  num_nurses:    number | null
  resources:     string[]
  services:      string[]
  bio:           string | null
  rating:        number
  reviews_count: number
}

export interface Shift {
  id:                 string
  clinic_id:          string
  title:              string
  description:        string | null
  specialty_required: string
  starts_at:          string
  ends_at:            string
  price:              number
  payment_timeframe:  string | null
  viaticos:           string | null
  shift_category:     ShiftCategory
  status:             ShiftStatus
  assigned_doctor_id: string | null
  cancelled_at:       string | null
  cancelled_reason:   string | null
  cancelled_by:       string | null
  created_at:         string
  updated_at:         string
}

export interface ShiftApplication {
  id:         string
  shift_id:   string
  doctor_id:  string
  status:     ApplicationStatus
  created_at: string
  updated_at: string
}

export interface Review {
  id:          string
  shift_id:    string
  reviewer_id: string
  reviewed_id: string
  rating:      number
  comment:     string | null
  created_at:  string
}

export interface Notification {
  id:         string
  user_id:    string
  shift_id:   string | null
  type:       NotificationType
  title:      string
  body:       string | null
  link:       string | null
  read_at:    string | null
  created_at: string
}

export type NotificationType =
  | 'new_application'
  | 'application_accepted'
  | 'application_rejected'
  | 'shift_cancelled'
  | 'shift_assigned'
  | 'doctor_withdrew'

// ── Vista pública (accounts_public) ───────────────────────────
export interface AccountPublic {
  id:                   string
  role:                 AccountRole
  full_name:            string
  avatar_url:           string | null
  cover_url:            string | null
  is_verified:          boolean
  created_at:           string
  // Doctor fields
  specialty:            string[] | null
  doctor_bio:           string | null
  experience_tags:      string[] | null
  km_from_cba:          number | null
  doctor_location:      string | null
  doctor_rating:        number | null
  doctor_reviews_count: number | null
  // Clinic fields
  address:              string | null
  clinic_location:      string | null
  complexity:           string[] | null
  num_doctors:          number | null
  num_nurses:           number | null
  resources:            string[] | null
  services:             string[] | null
  clinic_bio:           string | null
  clinic_rating:        number | null
  clinic_reviews_count: number | null
}

// ── Tipos compuestos para queries con joins ────────────────────
export interface ShiftWithClinic extends Shift {
  clinic: Pick<AccountPublic,
    'id' | 'full_name' | 'avatar_url' | 'is_verified' |
    'clinic_location' | 'clinic_rating' | 'clinic_reviews_count' |
    'num_doctors' | 'num_nurses' | 'resources' | 'complexity'
  >
}

export interface ApplicationWithDoctor extends ShiftApplication {
  doctor: Pick<AccountPublic,
    'id' | 'full_name' | 'avatar_url' | 'is_verified' |
    'specialty' | 'doctor_rating' | 'doctor_reviews_count' | 'km_from_cba'
  >
}

// ── Database type (para createClient<Database>) ────────────────
export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.1' }
  public: {
    Tables: {
      accounts: {
        Row:    Account
        Insert: Partial<Account> & { id: string; role: AccountRole; email: string; full_name: string }
        Update: Partial<Account>
        Relationships: []
      }
      doctor_profiles: {
        Row:    DoctorProfile
        Insert: Partial<DoctorProfile> & { id: string }
        Update: Partial<DoctorProfile>
        Relationships: [{
          foreignKeyName: 'doctor_profiles_id_fkey'
          columns: ['id']
          referencedRelation: 'accounts'
          referencedColumns: ['id']
        }]
      }
      clinic_profiles: {
        Row:    ClinicProfile
        Insert: Partial<ClinicProfile> & { id: string }
        Update: Partial<ClinicProfile>
        Relationships: [{
          foreignKeyName: 'clinic_profiles_id_fkey'
          columns: ['id']
          referencedRelation: 'accounts'
          referencedColumns: ['id']
        }]
      }
      shifts: {
        Row:    Shift
        Insert: Partial<Shift> & {
          clinic_id: string; title: string
          specialty_required: string; starts_at: string; ends_at: string; price: number
        }
        Update: Partial<Shift>
        Relationships: [
          { foreignKeyName: 'shifts_clinic_id_fkey';          columns: ['clinic_id'];          referencedRelation: 'accounts'; referencedColumns: ['id'] },
          { foreignKeyName: 'shifts_assigned_doctor_id_fkey'; columns: ['assigned_doctor_id']; referencedRelation: 'accounts'; referencedColumns: ['id'] },
        ]
      }
      shift_applications: {
        Row:    ShiftApplication
        Insert: Partial<ShiftApplication> & { shift_id: string; doctor_id: string }
        Update: Partial<ShiftApplication>
        Relationships: [
          { foreignKeyName: 'shift_applications_shift_id_fkey';  columns: ['shift_id'];  referencedRelation: 'shifts';   referencedColumns: ['id'] },
          { foreignKeyName: 'shift_applications_doctor_id_fkey'; columns: ['doctor_id']; referencedRelation: 'accounts'; referencedColumns: ['id'] },
        ]
      }
      reviews: {
        Row:    Review
        Insert: Partial<Review> & { shift_id: string; reviewer_id: string; reviewed_id: string; rating: number }
        Update: Partial<Review>
        Relationships: [
          { foreignKeyName: 'reviews_shift_id_fkey';    columns: ['shift_id'];    referencedRelation: 'shifts';   referencedColumns: ['id'] },
          { foreignKeyName: 'reviews_reviewer_id_fkey'; columns: ['reviewer_id']; referencedRelation: 'accounts'; referencedColumns: ['id'] },
          { foreignKeyName: 'reviews_reviewed_id_fkey'; columns: ['reviewed_id']; referencedRelation: 'accounts'; referencedColumns: ['id'] },
        ]
      }
      notifications: {
        Row:    Notification
        Insert: Partial<Notification> & { user_id: string; type: NotificationType; title: string }
        Update: Partial<Notification>
        Relationships: [
          { foreignKeyName: 'notifications_user_id_fkey';  columns: ['user_id'];  referencedRelation: 'accounts'; referencedColumns: ['id'] },
          { foreignKeyName: 'notifications_shift_id_fkey'; columns: ['shift_id']; referencedRelation: 'shifts';   referencedColumns: ['id'] },
        ]
      }
    }
    Views: {
      accounts_public: { Row: AccountPublic; Relationships: [] }
    }
    Functions: {
      guardian_get_role:        { Args: Record<never, never>; Returns: string }
      guardian_is_verified:     { Args: Record<never, never>; Returns: boolean }
      accept_shift_application: { Args: { p_application_id: string }; Returns: Json }
      withdraw_application:     { Args: { p_shift_id: string };       Returns: Json }
      cancel_shift:             { Args: { p_shift_id: string; p_reason?: string }; Returns: Json }
      mark_completed_shifts:    { Args: Record<never, never>; Returns: number }
    }
    Enums: {
      account_role:       AccountRole
      shift_status:       ShiftStatus
      application_status: ApplicationStatus
      shift_category:     ShiftCategory
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Update']
export type Enums<T extends keyof DefaultSchema['Enums']> =
  DefaultSchema['Enums'][T]

export const Constants = {
  public: {
    Enums: {
      account_role:       ['doctor', 'clinic', 'admin']                          as const,
      shift_status:       ['open', 'filled', 'completed', 'cancelled']           as const,
      application_status: ['pending', 'accepted', 'rejected', 'withdrawn']       as const,
      shift_category:     ['guardia', 'consultorio', 'ambulancia', 'otro']       as const,
    },
  },
} as const
