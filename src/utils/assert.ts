/** Fail early at data boundaries rather than allowing invalid game state to spread. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function assertFiniteNumber(value: unknown, name: string, minimum = 0): asserts value is number {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= minimum, `${name}必须是有限且不小于${minimum}的数字`)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
