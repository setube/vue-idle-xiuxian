import { assert, assertFiniteNumber, isRecord } from './assert'
import { getRealmLength, getRealmName } from '../plugins/realm'

export const MAX_CULTIVATION_BATCH = 100_000
export interface CultivationSnapshot {
  level: number
  spirit: number
  cultivation: number
  maxCultivation: number
  luck: number
  cultivationRate?: number
}
export interface CultivationBatchResult { spiritCost: number; cultivationGain: number; doubleGainTimes: number }

function assertLevel(level: number): void {
  assert(Number.isInteger(level) && level >= 1 && level <= getRealmLength(), '无效的境界等级')
}
export function getCultivationCost(level: number): number {
  assertLevel(level)
  let cost = Math.floor(10 * Math.pow(1.5, level - 1))
  if (level >= 10) {
    // Limit an unassisted realm's total spirit bill using the natural recovery rate.
    const hours = Math.min(8, 4 + (level - 10) / 4) * (level % 9 === 0 ? 1.5 : 1)
    const naturalRate = 1.2 ** (level - 1)
    const actions = Math.ceil(getRealmName(level).maxCultivation / getBaseCultivationGain(level))
    cost = Math.min(cost, Math.floor(hours * 3600 * naturalRate / actions))
  }
  assertFiniteNumber(cost, '修炼消耗')
  return cost
}
export function getBaseCultivationGain(level: number): number {
  assertLevel(level)
  const gain = Math.max(1, Math.floor(Math.pow(1.2, level - 1)))
  assertFiniteNumber(gain, '修炼收益', Number.MIN_VALUE)
  return gain
}
export function getCultivationGain(level: number, cultivationRate = 1): number {
  assertFiniteNumber(cultivationRate, '修炼速率', Number.MIN_VALUE)
  const gain = Number((getBaseCultivationGain(level) * cultivationRate).toFixed(6))
  assertFiniteNumber(gain, '修炼收益')
  return gain
}

export function getCultivationPlan(level: number, remaining: number, rate = 1) {
  const gain = getCultivationGain(level, rate)
  const cost = getCultivationCost(level)
  const times = Math.ceil(Math.round(Math.max(0, remaining) * 1e6) / Math.max(1, Math.round(gain * 1e6)))
  return { gain, cost, times, totalCost: times * cost }
}

export function assertCultivationSnapshot(value: unknown): asserts value is CultivationSnapshot {
  assert(isRecord(value), '无效的修炼数据')
  for (const key of ['level', 'spirit', 'cultivation', 'maxCultivation', 'luck']) {
    assertFiniteNumber(value[key], key)
  }
  if (value.cultivationRate !== undefined) assertFiniteNumber(value.cultivationRate, '修炼速率', Number.MIN_VALUE)
  assertLevel(value.level as number)
}

/** Bound work even when a corrupt worker request contains an enormous target. */
export function calculateCultivationBatch(player: CultivationSnapshot, random: () => number = Math.random): CultivationBatchResult {
  assertCultivationSnapshot(player)
  const { times, totalCost, gain } = getCultivationPlan(player.level, player.maxCultivation - player.cultivation, player.cultivationRate)
  assert(Number.isSafeInteger(times) && times <= MAX_CULTIVATION_BATCH, '单次修炼次数超出安全范围，请检查存档数据')
  assertFiniteNumber(totalCost, '修炼消耗')
  assert(player.spirit >= totalCost, '灵力不足！突破需要' + totalCost + '灵力，当前灵力：' + player.spirit.toFixed(1))
  let doubleGainTimes = 0
  const chance = Math.min(1, 0.3 * player.luck)
  if (chance >= 1) doubleGainTimes = times
  else if (chance > 0) {
    for (let i = 0; i < times; i++) if (random() < chance) doubleGainTimes++
  }
  return { spiritCost: totalCost, cultivationGain: (times + doubleGainTimes) * gain, doubleGainTimes }
}
