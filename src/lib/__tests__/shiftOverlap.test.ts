import { describe, it, expect } from 'vitest'
import { shiftsOverlap, hasConflict, type AssignedShiftBlock } from '../shiftOverlap'

function block(id: string, start: string, end: string): AssignedShiftBlock {
  return { id, starts_at: start, ends_at: end }
}

describe('shiftsOverlap', () => {
  it('no overlap — consecutive', () => {
    expect(shiftsOverlap(
      block('a', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
      block('b', '2025-01-01T16:00:00Z', '2025-01-02T00:00:00Z'),
    )).toBe(false)
  })

  it('no overlap — b before a', () => {
    expect(shiftsOverlap(
      block('a', '2025-01-01T16:00:00Z', '2025-01-02T00:00:00Z'),
      block('b', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
    )).toBe(false)
  })

  it('overlap — partial', () => {
    expect(shiftsOverlap(
      block('a', '2025-01-01T08:00:00Z', '2025-01-01T18:00:00Z'),
      block('b', '2025-01-01T16:00:00Z', '2025-01-02T00:00:00Z'),
    )).toBe(true)
  })

  it('overlap — b fully inside a', () => {
    expect(shiftsOverlap(
      block('a', '2025-01-01T06:00:00Z', '2025-01-01T22:00:00Z'),
      block('b', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
    )).toBe(true)
  })

  it('overlap — same exact times', () => {
    expect(shiftsOverlap(
      block('a', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
      block('b', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
    )).toBe(true)
  })
})

describe('hasConflict', () => {
  const assigned = [
    block('x', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
    block('y', '2025-01-02T08:00:00Z', '2025-01-02T16:00:00Z'),
  ]

  it('no conflict — different day', () => {
    expect(hasConflict(
      block('z', '2025-01-03T08:00:00Z', '2025-01-03T16:00:00Z'),
      assigned,
    )).toBe(false)
  })

  it('conflict detected', () => {
    expect(hasConflict(
      block('z', '2025-01-01T14:00:00Z', '2025-01-01T20:00:00Z'),
      assigned,
    )).toBe(true)
  })

  it('skips self by id', () => {
    expect(hasConflict(
      block('x', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
      assigned,
    )).toBe(false)
  })

  it('empty assigned — no conflict', () => {
    expect(hasConflict(
      block('z', '2025-01-01T08:00:00Z', '2025-01-01T16:00:00Z'),
      [],
    )).toBe(false)
  })
})
