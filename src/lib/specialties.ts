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

/**
 * Normaliza un nombre de especialidad para comparación tolerante.
 * Ej: "Gineco/obstetricia" → "ginecologiaobstetricia"
 *     "Ginecología y Obstetricia" → "ginecologiaobstetricia"
 */
function normalizeSpecialty(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quitar acentos
    .replace(/\b(y|de|del|la|el|las|los)\b/g, '')       // quitar artículos/preposiciones
    .replace(/[^a-z0-9]/g, '')                           // solo alfanumérico
}

const CANONICAL_INDEX = new Map<string, string>(
  MEDICAL_SPECIALTIES.map(s => [normalizeSpecialty(s), s])
)

/**
 * Dado un nombre de especialidad (posiblemente con typo o formato viejo),
 * devuelve el nombre canónico de MEDICAL_SPECIALTIES o null si no matchea.
 */
export function matchCanonicalSpecialty(raw: string): string | null {
  // Match exacto primero
  if ((MEDICAL_SPECIALTIES as readonly string[]).includes(raw)) return raw
  // Match normalizado
  return CANONICAL_INDEX.get(normalizeSpecialty(raw)) ?? null
}

/**
 * Compara dos nombres de especialidad de forma tolerante.
 */
export function specialtiesMatch(a: string, b: string): boolean {
  if (a === b) return true
  return normalizeSpecialty(a) === normalizeSpecialty(b)
}

const GENERAL_NORMALIZED = new Set(
  [...GENERAL_SPECIALTIES].map(normalizeSpecialty)
)

/**
 * Verifica si una especialidad es general (tolerante a typos/formato).
 */
export function isGeneralSpecialty(s: string | null | undefined): boolean {
  if (!s) return true
  if (GENERAL_SPECIALTIES.has(s)) return true
  return GENERAL_NORMALIZED.has(normalizeSpecialty(s))
}
