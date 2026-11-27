import { expect, test } from 'bun:test'
import { getGachaOdds, rollGacha } from '../src/plugins/gacha'

test('all displayed gacha intervals give the matching reward in each pool, with or without wishes', () => {
  for (const pool of ['all', 'equipment', 'pet'] as const) {
    for (const enabled of [false, true]) {
      const odds = getGachaOdds(pool, enabled ? 'mythic' : null, enabled ? 'divine' : null)
      let start = 0
      for (const quality of Object.keys(odds.equipment) as (keyof typeof odds.equipment)[]) {
        const probability = odds.equipment[quality]
        if (probability > 0) expect(rollGacha(odds, start + probability / 2)).toEqual({ type: 'equipment', quality })
        start += probability
      }
      for (const rarity of Object.keys(odds.pet) as (keyof typeof odds.pet)[]) {
        const probability = odds.pet[rarity]
        if (probability > 0) expect(rollGacha(odds, start + probability / 2)).toEqual({ type: 'pet', rarity })
        start += probability
      }
      expect(start).toBeCloseTo(1, 12)
      expect(odds.price).toBe(enabled ? 200 : 100)
    }
  }
  expect(getGachaOdds('all', null, null).equipment.mythic).toBe(0.005)
  expect(getGachaOdds('all', 'mythic', 'divine').equipment.mythic).toBe(0.01)
  expect(getGachaOdds('all', 'mythic', 'divine').pet.divine).toBe(0.002)
  expect(getGachaOdds('equipment', null, 'divine').price).toBe(100)
  expect(getGachaOdds('pet', 'mythic', null).price).toBe(100)
})
