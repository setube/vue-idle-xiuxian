import { describe, expect, test } from 'bun:test'
import { getRealmLength } from '../src/plugins/realm'
import { locations } from '../src/plugins/locations'
import { CombatEntity, CombatManager, CombatState } from '../src/plugins/combat'
import { MAX_CULTIVATION_BATCH, calculateCultivationBatch, getCultivationCost, getCultivationGain } from '../src/utils/cultivation'

describe('cultivation calculations', () => {
  test('keeps the original first realm price and gain', () => {
    expect(getCultivationCost(1)).toBe(10)
    expect(getCultivationGain(1)).toBe(1)
    expect(getCultivationCost(2)).toBe(15)
    expect(getCultivationGain(2)).toBe(1)
    expect(getCultivationGain(1, 1.2)).toBe(1)
    expect(getCultivationGain(1, 1.9)).toBe(1)
    expect(getCultivationGain(1, 2)).toBe(2)
    expect(() => getCultivationGain(2, Number.MAX_VALUE)).toThrow('有限')
  })

  test('aggregates a safe breakthrough batch while retaining luck bonuses', () => {
    const player = { level: 1, spirit: 900, cultivation: 10, maxCultivation: 100, luck: 1 }
    expect(calculateCultivationBatch(player, () => 0.9)).toEqual({
      spiritCost: 900,
      cultivationGain: 90,
      doubleGainTimes: 0
    })
    expect(calculateCultivationBatch(player, () => 0)).toEqual({
      spiritCost: 900,
      cultivationGain: 180,
      doubleGainTimes: 90
    })
  })

  test('rejects malformed or unbounded batches before looping', () => {
    expect(() => calculateCultivationBatch({
      level: 1, spirit: Number.MAX_SAFE_INTEGER, cultivation: 0,
      maxCultivation: Number.MAX_SAFE_INTEGER, luck: 1
    })).toThrow('单次修炼次数超出安全范围')
    expect(() => calculateCultivationBatch({ level: 0, spirit: 100, cultivation: 0, maxCultivation: 1, luck: 1 })).toThrow('境界等级')
    expect(() => getCultivationGain(getRealmLength() + 1)).toThrow('境界等级')
  })

  test('uses common cost and gain functions across the realm table', () => {
    for (let level = 1; level <= getRealmLength(); level++) {
      expect(getCultivationCost(level)).toBeGreaterThan(0)
      expect(getCultivationGain(level)).toBeGreaterThan(0)
    }
    expect(MAX_CULTIVATION_BATCH).toBe(100_000)
  })
})

test('raises exploration costs tenfold to curb high-realm spirit accumulation', () => {
  expect(locations.map(({ id, spiritCost }) => [id, spiritCost])).toEqual([
    ['newbie_village', 500],
    ['celestial_mountain', 15_000],
    ['phoenix_valley', 20_000],
    ['dragon_abyss', 30_000],
    ['immortal_realm', 50_000]
  ])
})

test('applies auto-heal effects at the start of a combat turn', () => {
  const player = new CombatEntity('修士', 1, {
    health: 100, maxHealth: 100, damage: 1000, speed: 1000, autoHeal: 0.1,
    critRate: 0, comboRate: 0, vampireRate: 0
  })
  const enemy = new CombatEntity('妖兽', 1, { health: 100, maxHealth: 100, damage: 1, speed: 1, dodgeRate: 0 })
  player.currentHealth = 50
  const combat = new CombatManager(player, enemy)
  combat.start()
  const result = combat.executeTurn()

  expect(player.currentHealth).toBe(60)
  expect(combat.getCombatLog()[0]).toContain('恢复10.0点生命值')
  expect(result?.state).toBe(CombatState.VICTORY)
})
