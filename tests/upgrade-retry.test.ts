import { expect, test } from 'bun:test'
import { enhanceEquipment, enhancementPreview } from '../src/plugins/equipment'
import type { Equipment } from '../src/types/game'
import { recordBattle, compareBattles, type BattleReport } from '../src/plugins/battle-report'
import { createInitialState } from '../src/stores/player'
import { normalizePlayerData } from '../src/stores/save'

const weapon = (level: number): Equipment => ({
  id: 'w', name: '青锋', type: 'weapon', quality: 'common', enhanceLevel: level, stats: { attack: 20, critRate: 0.131 }
})

test('every enhancement below the cap is attainable and uses the exact preview', () => {
  for (let level = 0; level < 100; level++) {
    const item = weapon(level)
    const preview = enhancementPreview(item)!
    expect(preview.successRate).toBe(Math.max(0.25, 1 - level * 0.05))
    expect(preview.cost).toBe(10 * (level + 1))
    const result = enhanceEquipment(item, preview.cost, () => 0)
    expect(result.newStats).toEqual(preview.stats)
    expect(item.enhanceLevel).toBe(level + 1)
  }
  const capped = weapon(100)
  expect(enhancementPreview(capped)).toBeNull()
  expect(enhanceEquipment(capped, 2000).success).toBe(false)
})

test('an unsuccessful roll or insufficient materials preserves the equipment', () => {
  const item = weapon(20)
  expect(enhanceEquipment(item, 209, () => 0).success).toBe(false)
  expect(enhanceEquipment(item, 210, () => 0.25).cost).toBe(0)
  expect(item).toEqual(weapon(20))
})

test('retry history compares only the same floor and difficulty and survives a save round trip', () => {
  const attempt: BattleReport = { difficulty: 1, floor: 3, won: false, rounds: 10, enemyRemaining: 71, result: '超时', settlement: '无损失' }
  let history = recordBattle([], attempt)
  history = recordBattle(history, { ...attempt, difficulty: 5 })
  history = recordBattle(history, { ...attempt, enemyRemaining: 18 })
  expect(compareBattles(history[0], history[1])).toContain('71%；本次 10 回合，剩余 18%')
  history = recordBattle(history, { ...attempt, won: true, enemyRemaining: 0, rounds: 6 })
  expect(compareBattles(history[0], history[1])).toContain('这次已通关')
  expect(history).toHaveLength(3)
  expect(compareBattles(history[0], history[2])).toBe('')
  const player = createInitialState()
  player.dungeonReports = history
  expect(normalizePlayerData(player, createInitialState()).dungeonReports).toEqual(history)
  expect(normalizePlayerData({ ...player, dungeonReports: undefined }, createInitialState()).dungeonReports).toEqual([])
  history = recordBattle(history, { ...attempt, floor: 4 })
  expect(history).toHaveLength(2)
  expect(compareBattles(history[0], history[1])).toBe('')
})
