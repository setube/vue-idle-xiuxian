import type { Equipment, EquipmentQuality, EquipmentSlot, Stats } from '../types/game'
import type { PlayerState } from '../types/player'
import { equipmentQualities, isEquipmentQuality } from './equipment-quality'
import { isPercentageStat } from './stats'

type StatRange = { name: string; min: number; max: number }

// 装备基础属性
const equipmentBaseStats: Record<EquipmentSlot, Record<string, StatRange>> = {
  weapon: {
    attack: { name: '攻击', min: 10, max: 20 },
    critRate: { name: '暴击率', min: 0.05, max: 0.1 },
    critDamageBoost: { name: '暴击伤害', min: 0.1, max: 0.3 }
  },
  head: {
    defense: { name: '防御', min: 5, max: 10 },
    health: { name: '生命', min: 50, max: 100 },
    stunResist: { name: '抗眩晕', min: 0.05, max: 0.1 }
  },
  body: {
    defense: { name: '防御', min: 8, max: 15 },
    health: { name: '生命', min: 80, max: 150 },
    finalDamageReduce: { name: '最终减伤', min: 0.05, max: 0.1 }
  },
  feet: {
    defense: { name: '防御', min: 4, max: 8 },
    speed: { name: '速度', min: 8, max: 15 },
    dodgeRate: { name: '闪避率', min: 0.05, max: 0.1 }
  },
  wrist: {
    defense: { name: '防御', min: 3, max: 8 },
    counterRate: { name: '反击率', min: 0.05, max: 0.1 },
    vampireRate: { name: '吸血率', min: 0.05, max: 0.1 }
  },
  necklace: {
    health: { name: '生命', min: 60, max: 120 },
    healBoost: { name: '强化治疗', min: 0.1, max: 0.2 },
    spiritRate: { name: '灵力获取', min: 0.1, max: 0.2 }
  },
  ring: {
    attack: { name: '攻击', min: 5, max: 10 },
    critDamageBoost: { name: '暴击伤害', min: 0.1, max: 0.2 },
    finalDamageBoost: { name: '最终增伤', min: 0.05, max: 0.1 }
  },
  artifact: {
    attack: { name: '攻击力', min: 0.1, max: 0.3 },
    critRate: { name: '暴击率', min: 0.1, max: 0.3 },
    comboRate: { name: '连击率', min: 0.1, max: 0.3 }
  }
}

// Percentage stats are stored as ratios. An artifact's attack bonus is fractional too.
export function roundEquipmentStat(slot: EquipmentSlot, stat: string, value: number): number {
  const scale = isPercentageStat(stat) ? 10_000 : slot === 'artifact' && stat === 'attack' ? 100 : 1
  return Math.round(value * scale) / scale
}

function rollRanges(slot: EquipmentSlot, random: () => number) {
  const base = equipmentBaseStats[slot]
  if (slot === 'ring' && random() >= 0.5) return {
    defense: equipmentBaseStats.head.defense!,
    critDamageReduce: { name: '爆伤减免', min: 0.1, max: 0.2 },
    resistanceBoost: { name: '抗性提升', min: 0.05, max: 0.1 }
  }
  if (slot === 'wrist' && random() >= 0.5) return {
    attack: { name: '攻击', min: 5, max: 10 },
    critRate: { name: '暴击率', min: 0.03, max: 0.08 },
    comboRate: { name: '连击率', min: 0.05, max: 0.1 }
  }
  if (slot === 'body') {
    const roll = random()
    const stat = roll < 1 / 3 ? 'counterRate' : roll < 2 / 3 ? 'finalDamageReduce' : 'combatBoost'
    return { defense: base.defense!, health: base.health!, [stat]: base.finalDamageReduce! }
  }
  return base
}

export function rollEquipmentStats(slot: EquipmentSlot, quality: EquipmentQuality, level: number, random = Math.random): Stats {
  const factor = equipmentQualities[quality].statMod * (1 + level * 0.1)
  const stats: Stats = {}
  for (const [key, range] of Object.entries(rollRanges(slot, random))) {
    stats[key] = roundEquipmentStat(slot, key, (range.min + random() * (range.max - range.min)) * factor)
  }
  return stats
}

// Old saves have no original roll. Restore only existing zero modifiers whose original range was positive.
export function repairRoundedStats(item: Equipment): Stats {
  const restored: Stats = {}
  if (!isEquipmentQuality(item.quality)) return restored
  const factor = equipmentQualities[item.quality].statMod * (1 + 0.1 * (item.level ?? item.requiredRealm ?? 1))
  const enhancement = 1.1 ** Math.min(100, item.enhanceLevel ?? 0)
  for (const [key, value] of Object.entries(item.stats)) {
    const range = equipmentBaseStats[item.type][key]
    if (value !== 0 || !range || range.min >= 0.5 || range.min <= 0) continue
    restored[key] = roundEquipmentStat(item.type, key, (range.min + range.max) / 2 * factor * enhancement)
    item.stats[key] = restored[key]
  }
  return restored
}

export function equipmentDifferences(next: Stats, previous: Stats): Stats {
  const changes: Stats = {}
  for (const key of new Set([...Object.keys(next), ...Object.keys(previous)])) {
    const delta = (next[key] ?? 0) - (previous[key] ?? 0)
    if (Math.abs(delta) > 1e-9) changes[key] = delta
  }
  return changes
}

type AttributeGroups = Pick<PlayerState, 'artifactBonuses' | 'baseAttributes' | 'combatAttributes' | 'combatResistance' | 'specialAttributes'>
export function applyEquipmentChanges(player: AttributeGroups, changes: Stats): void {
  const groups = [player.baseAttributes, player.combatAttributes, player.combatResistance, player.specialAttributes]
  for (const [key, change] of Object.entries(changes)) {
    if (!Object.hasOwn(player.artifactBonuses, key)) continue
    player.artifactBonuses[key] += change
    const group = groups.find(values => Object.hasOwn(values, key))
    // Keep raw totals so removing one of two capped bonuses is reversible.
    // Effective combat chance and resistance are capped by the player getters.
    if (group) group[key] = Math.max(0, group[key] + change)
  }
}
