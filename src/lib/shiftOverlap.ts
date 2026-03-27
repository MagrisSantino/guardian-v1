import { addHours, parseISO, subHours } from 'date-fns'

export type AssignedShiftBlock = {
  id: string
  date_time: string
  duration_hours: number | null
}

/**
 * Solapamiento con margen de 12 h (mismo criterio que el feed del médico):
 * ventana bloqueada [inicio−12h, fin+12h] por cada guardia asignada.
 */
export function hasIncompatibleAssignedShift(
  candidateStart: Date,
  candidateDurationHours: number,
  assignedShifts: AssignedShiftBlock[],
  excludeShiftId: string,
): boolean {
  const shiftEnd = addHours(candidateStart, candidateDurationHours)
  for (const c of assignedShifts) {
    if (excludeShiftId && c.id === excludeShiftId) continue
    const confStart = parseISO(c.date_time)
    const confEnd = addHours(confStart, c.duration_hours ?? 0)
    const marginStart = subHours(confStart, 12)
    const marginEnd = addHours(confEnd, 12)
    if (candidateStart <= marginEnd && marginStart <= shiftEnd) return true
  }
  return false
}

/** La guardia pendiente (candidata) choca con la recién asignada (±12 h). */
export function pendingShiftConflictsWithAssignedShift(
  pendingDateTime: string,
  pendingDurationHours: number | null,
  assigned: AssignedShiftBlock,
): boolean {
  return hasIncompatibleAssignedShift(
    parseISO(pendingDateTime),
    Number(pendingDurationHours) || 0,
    [assigned],
    '',
  )
}
