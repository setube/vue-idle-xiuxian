import { createPinia, setActivePinia } from "pinia"
import { usePlayerStore } from "../src/stores/player"
import { focusPreview } from "../src/plugins/equipment"
import { expect, test } from 'bun:test'
import { rollEquipmentStats, repairRoundedStats, equipmentDifferences, applyEquipmentChanges } from '../src/plugins/equipment-stats'
import { enhanceEquipment } from '../src/plugins/equipment'
import { describeBattle } from '../src/plugins/battle-report'
import { CombatEntity, CombatManager } from '../src/plugins/combat'
import { createInitialState } from '../src/stores/player'
import { normalizePlayerData } from '../src/stores/save'
import type { Equipment, EquipmentSlot } from '../src/types/game'

test('lowest roll gives every generated modifier a positive value, including artifact attack and rates', () => {
  const slots = Object.keys(createInitialState().equippedArtifacts) as EquipmentSlot[]
  for (const slot of slots) {
    const stats = rollEquipmentStats(slot, 'common', 1, () => 0)
    for (const value of Object.values(stats)) expect(value).toBeGreaterThan(0)
  }
  expect(rollEquipmentStats('artifact', 'common', 1, () => 0)).toEqual({ attack: 0.11, critRate: 0.11, comboRate: 0.11 })
})

test('repair of old equipped stats is idempotent, preserves existing modifiers and respects enhancement', () => {
  const old = createInitialState()
  const item: Equipment = { id: 'test', name: '青玉', type: 'artifact', quality: 'common', level: 1, enhanceLevel: 2,
    stats: { attack: 0, comboRate: 0, critRate: 0.07 } }
  old.equippedArtifacts.artifact = item
  old.artifactBonuses.critRate = 0.07
  old.combatAttributes.critRate = 0.07
  old.items.push({ ...item, id: 'bag' })
  const restored = normalizePlayerData(old, createInitialState())
  const repaired = restored.equippedArtifacts.artifact!
  expect(repaired.enhanceLevel).toBe(2)
  expect(repaired.stats).toEqual({ attack: 0.27, comboRate: 0.2662, critRate: 0.07 })
  expect(restored.baseAttributes.attack).toBeCloseTo(old.baseAttributes.attack + 0.27)
  expect(restored.combatAttributes.comboRate).toBeCloseTo(0.2662)
  expect(normalizePlayerData(restored, createInitialState())).toEqual(restored)
  expect(repairRoundedStats(repaired)).toEqual({})
  applyEquipmentChanges(restored, equipmentDifferences({}, repaired.stats))
  expect(restored.baseAttributes.attack).toBeCloseTo(old.baseAttributes.attack)
  expect(restored.combatAttributes.comboRate).toBeCloseTo(0)
})

test('enhancement retains small bonuses and comparisons include losses and gains', () => {
  const item: Equipment = { id: 'necklace', name: '灵珠', type: 'necklace', quality: 'rare', stats: { spiritRate: 0.12, healBoost: 0.06 } }
  const result = enhanceEquipment(item, 10)
  expect(result.newStats).toEqual({ spiritRate: 0.132, healBoost: 0.066 })
  const differences = equipmentDifferences({ attack: 12, defense: 5 }, { attack: 8, health: 20, defense: 5 })
  expect(differences).toEqual({ attack: 4, health: -20 })
})

test('battle report distinguishes timeout, last-round knockout and victory', () => {
  const combat = new CombatManager(new CombatEntity('修士', 1, { health: 100 }), new CombatEntity('山猪', 1, { health: 200 }))
  combat.round = combat.maxRounds + 1
  combat.state = 'defeat'
  combat.enemy.currentHealth = 36
  expect(describeBattle(combat)).toContain('撑满 10 回合，时间耗尽。山猪还剩 18%')
  combat.round = 10
  combat.player.currentHealth = 0
  expect(describeBattle(combat)).toContain('第 10 回合气血耗尽')
  combat.state = 'victory'
  combat.player.currentHealth = 25
  expect(describeBattle(combat)).toContain('第 10 回合击败山猪，你还剩 25%')
})

test('focused refinement charges only for effective gains and keeps the other rolls', () => {
  setActivePinia(createPinia())
  const p = usePlayerStore()
  p.level = 7
  const sword: Equipment = { id:'test', name:'紫霄武器', type:'weapon', quality:'mythic', enhanceLevel:2,
    stats:{attack:94,critRate:0.298,critDamageBoost:0.806} }
  p.equippedArtifacts.weapon = sword
  applyEquipmentChanges(p,sword.stats)
  const power = p.combatPower
  p.refinementStones = 15
  expect(focusPreview(p,sword,'attack')).toEqual({stat:'attack',before:94,after:119,power:50})
  expect(p.focusEquipment(sword,'attack').success).toBe(true)
  expect(sword.stats).toEqual({attack:119,critRate:0.298,critDamageBoost:0.806})
  expect(p.combatPower-power).toBeCloseTo(50)
  expect(p.refinementStones).toBe(10)
  p.combatAttributes.critRate = 0.99
  expect(p.focusEquipment(sword,'critRate').success).toBe(true)
  expect(p.effectiveCombatAttributes.critRate).toBeCloseTo(1)
  expect(p.focusEquipment(sword,'critRate').success).toBe(false)
  expect(p.focusEquipment(sword,'missing').success).toBe(false)
  expect(p.refinementStones).toBe(5)
  p.refinementStones=4
  expect(p.focusEquipment(sword,'attack').success).toBe(false)
  expect(sword.stats.attack).toBe(119)
})

test('refining spare equipment changes only the spare; worn caps exclude the piece being replaced', () => {
  setActivePinia(createPinia())
  const p=usePlayerStore()
  const worn: Equipment={id:'w',type:'weapon',name:'旧剑',quality:'common',stats:{critRate:0.5}}
  const spare: Equipment={...worn,id:'s',stats:{critRate:0.2}}
  p.combatAttributes.critRate=1
  p.equippedArtifacts.weapon=worn
  p.items.push(spare)
  p.refinementStones=5
  const power=p.combatPower
  expect(focusPreview(p,spare,'critRate')!.power).toBeGreaterThan(0)
  expect(p.focusEquipment(spare,'critRate').success).toBe(true)
  expect(p.combatPower).toBe(power)
  expect(p.refinementStones).toBe(0)
  expect(spare.stats.critRate).toBeGreaterThan(0.2)
})
