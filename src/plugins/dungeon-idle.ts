import { highestFloorKey } from './battle-report'
import type { PlayerState } from '../types/player'
import { assert, isRecord } from '../utils/assert'

export const MAX_OFFLINE_SECONDS = 8 * 3600
export const dungeonNames: Record<number, string> = { 1: '简单', 2: '普通', 5: '困难', 10: '地狱', 100: '通天' }
const HOUR = 3_600_000
interface Income { ms: number; stones: number; refinement: number }
export interface DungeonIdle extends Income {
  difficulty: number
  floor: number
  at: number
  stoneRemainder: number
  refinementRemainder: number
  away: Income
}
export const newDungeonIdle = (): DungeonIdle => ({
  difficulty: 1, floor: 0, at: 0, stoneRemainder: 0, refinementRemainder: 0,
  ms: 0, stones: 0, refinement: 0, away: { ms: 0, stones: 0, refinement: 0 }
})

export function idleRates(difficulty: number, floor: number) {
  return { stones: 120 * floor * difficulty, refinement: Math.min(floor, 3 + Math.floor(floor / 2)) * difficulty }
}

export function canIdleAt(player: PlayerState, difficulty: number, floor: number) {
  return Object.hasOwn(dungeonNames, difficulty) && Number.isSafeInteger(floor) &&
    floor >= 1 && floor <= player[highestFloorKey(difficulty)]
}

// Commit the clock, fractional progress and both currencies in the same save snapshot.
export function settleDungeonIdle(player: PlayerState, now: number, paused: boolean, returning = false) {
  const idle = player.dungeonIdle
  if (!idle.floor || now <= idle.at) return
  const elapsed = now - idle.at
  idle.at = now
  if (paused || !canIdleAt(player, idle.difficulty, idle.floor)) return
  const ms = Math.min(MAX_OFFLINE_SECONDS * 1000, elapsed)
  const rates = idleRates(idle.difficulty, idle.floor)
  const stoneUnits = idle.stoneRemainder + ms * rates.stones
  const refinementUnits = idle.refinementRemainder + ms * rates.refinement
  const stones = Math.floor(stoneUnits / HOUR), refinement = Math.floor(refinementUnits / HOUR)
  idle.stoneRemainder = stoneUnits % HOUR
  idle.refinementRemainder = refinementUnits % HOUR
  idle.ms += ms
  idle.stones += stones
  idle.refinement += refinement
  player.spiritStones += stones
  player.refinementStones += refinement
  if ((returning || elapsed >= 60_000) && (ms >= 60_000 || stones > 0 || refinement > 0)) idle.away = { ms, stones, refinement }
}

export function readDungeonIdle(value: unknown, player: PlayerState): DungeonIdle {
  assert(isRecord(value) && isRecord(value.away), '秘境挂机记录无效')
  const idle = newDungeonIdle()
  for (const key of Object.keys(idle) as (keyof DungeonIdle)[]) {
    if (key === 'away') continue
    const n = value[key]
    assert(typeof n === 'number' && Number.isSafeInteger(n) && n >= 0, '秘境挂机数值无效')
    idle[key] = n
  }
  for (const key of ['ms', 'stones', 'refinement'] as const) {
    const n = value.away[key]
    assert(typeof n === 'number' && Number.isSafeInteger(n) && n >= 0, '挂机收益无效')
    idle.away[key] = n
  }
  assert(idle.stoneRemainder < HOUR && idle.refinementRemainder < HOUR && Object.hasOwn(dungeonNames,idle.difficulty), '挂机进度无效')
  assert(!idle.floor || (idle.at > 0 && canIdleAt(player, idle.difficulty, idle.floor)), '挂机层数未解锁')
  return idle
}
