import { getRandomHerb, herbs } from '../src/plugins/herbs'
import { pillRecipes } from '../src/plugins/pills'
import { describe, expect, test } from 'bun:test'
import { getRealmLength, getRealmName } from '../src/plugins/realm'
import { locations } from '../src/plugins/locations'
import { CombatEntity, CombatManager, CombatState } from '../src/plugins/combat'
import { MAX_CULTIVATION_BATCH, calculateCultivationBatch, getCultivationCost, getCultivationGain } from '../src/utils/cultivation'

describe('cultivation calculations', () => {
  test('uses ordinary base gains and retains fractional bonuses', () => {
    expect(getCultivationCost(1)).toBe(10)
    expect(getCultivationGain(1)).toBe(1)
    expect(getCultivationCost(2)).toBe(15)
    expect(getCultivationGain(2)).toBe(1)
    expect(getCultivationGain(3)).toBe(1)
    expect(getCultivationGain(4)).toBe(1)
    expect(getCultivationGain(1, 1.3)).toBe(1.3)
    expect(() => getCultivationGain(5, Number.MAX_VALUE)).toThrow('有限')
  })

  test('aggregates a safe breakthrough batch while retaining luck bonuses', () => {
    const player = { level: 1, spirit: 100, cultivation: 12, maxCultivation: 25, cultivationRate: 1.3, luck: 1 }
    expect(calculateCultivationBatch(player, () => 0.9)).toEqual({
      spiritCost: 100,
      cultivationGain: 13,
      doubleGainTimes: 0
    })
    expect(calculateCultivationBatch(player, () => 0)).toEqual({
      spiritCost: 100,
      cultivationGain: 26,
      doubleGainTimes: 10
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

  test('late breakthrough costs fit the natural recovery budget and safe arithmetic', () => {
    for (let level = 10; level < getRealmLength(); level++) {
      const actions = Math.ceil(getRealmName(level).maxCultivation / getCultivationGain(level))
      const bill = actions * getCultivationCost(level)
      expect(Number.isSafeInteger(bill)).toBe(true)
      const hours = bill / (1.2 ** (level - 1)) / 3600
      expect(hours).toBeLessThanOrEqual(level % 9 === 0 ? 12 : 8)
    }
    expect(getCultivationCost(9)).toBe(256)
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
    ['newbie_village', 100],
    ['celestial_mountain', 15_000],
    ['phoenix_valley', 20_000],
    ['dragon_abyss', 30_000],
    ['immortal_realm', 50_000]
  ])
})

test('each side can counter once per incoming regular hit and still gets its normal turn', () => {
  const stats = { health: 10000, damage: 10, dodgeResist: 1, counterRate: 1 }
  const combat = new CombatManager(new CombatEntity('同名', 1, { ...stats, speed: 20 }), new CombatEntity('同名', 1, stats))
  combat.start()
  expect(combat.executeTurn()?.results.map(hit => hit.playerAttack)).toEqual([true, false, false, true])
})

test('critical damage reduction is applied to an incoming critical strike', () => {
  const attacker = new CombatEntity('甲', 1, { dodgeResist: 1 })
  const defender = new CombatEntity('乙', 1, { health: 1000, critDamageReduce: 0.5 })
  const regular = defender.takeDamage(100, attacker).damage
  expect(defender.takeDamage(100, attacker, true).damage).toBeCloseTo(regular / 2)
})

test('applies auto-heal effects at the start of a combat turn', () => {
  const player = new CombatEntity('修士', 1, {
    health: 100, maxHealth: 100, damage: 1000, speed: 1000, autoHeal: 0.1,
    critRate: 0, comboRate: 0, vampireRate: 0, dodgeResist: 1
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

test('all alchemy ingredients can actually roll on their advertised maps', () => {
  const original = Math.random
  const seen = new Set<string>()
  try {
    for (const place of locations) {
      const pool = herbs.filter(h => place.herbIds.includes(h.id))
      const total = pool.reduce((sum, h) => sum + h.chance, 0)
      let lower = 0
      for (const h of pool) {
        Math.random = () => (lower + h.chance / 2) / total
        expect(getRandomHerb(place.herbIds)?.id).toBe(h.id)
        lower += h.chance
        seen.add(h.id)
      }
    }
    for (const recipe of pillRecipes) for (const m of recipe.materials) expect(seen.has(m.herb)).toBe(true)
  } finally { Math.random = original }
})
