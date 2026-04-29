import { describe, it, expect } from 'vitest'
import { specialtiesMatch, isGeneralSpecialty, matchCanonicalSpecialty } from '../specialties'

describe('specialtiesMatch', () => {
  it('exact match', () => {
    expect(specialtiesMatch('Cardiología', 'Cardiología')).toBe(true)
  })

  it('accent-insensitive', () => {
    expect(specialtiesMatch('Cardiologia', 'Cardiología')).toBe(true)
  })

  it('sin acento vs con acento — Ginecología', () => {
    expect(specialtiesMatch('Ginecologia y Obstetricia', 'Ginecología y Obstetricia')).toBe(true)
  })

  it('case insensitive', () => {
    expect(specialtiesMatch('cardiología', 'Cardiología')).toBe(true)
  })

  it('different specialties', () => {
    expect(specialtiesMatch('Cardiología', 'Neurología')).toBe(false)
  })
})

describe('isGeneralSpecialty', () => {
  it('Generalista is general', () => {
    expect(isGeneralSpecialty('Generalista')).toBe(true)
  })

  it('Médico Clínico is general', () => {
    expect(isGeneralSpecialty('Médico Clínico')).toBe(true)
  })

  it('Medicina de Emergencias is general', () => {
    expect(isGeneralSpecialty('Medicina de Emergencias')).toBe(true)
  })

  it('null/undefined is general (open shift)', () => {
    expect(isGeneralSpecialty(null)).toBe(true)
    expect(isGeneralSpecialty(undefined)).toBe(true)
    expect(isGeneralSpecialty('')).toBe(true)
  })

  it('specific specialty is not general', () => {
    expect(isGeneralSpecialty('Cardiología')).toBe(false)
    expect(isGeneralSpecialty('Neurología')).toBe(false)
  })

  it('typo-tolerant for general specialties', () => {
    expect(isGeneralSpecialty('Medico Clinico')).toBe(true)
  })
})

describe('matchCanonicalSpecialty', () => {
  it('exact match returns canonical', () => {
    expect(matchCanonicalSpecialty('Cardiología')).toBe('Cardiología')
  })

  it('normalized match without accents', () => {
    expect(matchCanonicalSpecialty('Cardiologia')).toBe('Cardiología')
  })

  it('unknown specialty returns null', () => {
    expect(matchCanonicalSpecialty('Astrología')).toBeNull()
  })
})
