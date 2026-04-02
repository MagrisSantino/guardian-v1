export const MEDICAL_SPECIALTIES = [
  'Generalista',
  'Médico Clínico',
  'Medicina de Emergencias',
  'Pediatría',
  'Neonatología',
  'Ginecología y Obstetricia',
  'Cirugía General',
  'Traumatología y Ortopedia',
  'Cardiología',
  'Neurología',
  'Neurocirugía',
  'Anestesiología',
  'Terapia Intensiva (UTI/UCI)',
  'Urología',
  'Oftalmología',
  'Otorrinolaringología',
  'Dermatología',
  'Psiquiatría',
  'Gastroenterología',
  'Endocrinología',
  'Neumología',
  'Reumatología',
  'Nefrología',
  'Infectología',
  'Hematología',
  'Oncología',
  'Radiología',
  'Medicina del Trabajo',
  'Geriatría',
  'Rehabilitación',
] as const

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number]

/**
 * Especialidades "generales": cualquier médico verificado puede ver y postularse
 * a guardias con estas especialidades, sin importar sus especialidades cargadas.
 */
export const GENERAL_SPECIALTIES = new Set<string>([
  'Generalista',
  'Médico Clínico',
  'Medicina de Emergencias',
])
