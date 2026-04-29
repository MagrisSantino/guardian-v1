import { parseISO } from 'date-fns'

export type AssignedShiftBlock = {
  id: string
  starts_at: string
  ends_at: string
}

export function shiftsOverlap(a: AssignedShiftBlock, b: AssignedShiftBlock): boolean {
  const aStart = parseISO(a.starts_at)
  const aEnd   = parseISO(a.ends_at)
  const bStart = parseISO(b.starts_at)
  const bEnd   = parseISO(b.ends_at)
  return aStart < bEnd && bStart < aEnd
}

export function hasConflict(
  candidate: AssignedShiftBlock,
  assignedShifts: AssignedShiftBlock[],
): boolean {
  return assignedShifts.some(
    (s) => s.id !== candidate.id && shiftsOverlap(candidate, s),
  )
}
