import { equipmentQualities, isEquipmentQuality } from './equipment-quality'
import { battlePoints, projectedChanges } from './companion-ranking'
import type { PlayerState } from '../types/player'
import { roundEquipmentStat } from './equipment-stats'
import { isPercentageStat } from './stats'
import type { Equipment, EquipmentSlot, Stats } from '../types/game'

export interface EquipmentChangeResult { success: boolean; message: string; cost?: number; oldStats?: Stats; newStats?: Stats; newLevel?: number; confirmed?: boolean }

// 装备强化和洗练相关配置

// 强化等级配置
const enhanceConfig = {
  maxLevel: 100, // 最大强化等级
  minimumSuccessRate: 0.25,
  baseSuccessRate: 1, // 基础成功率
  costPerLevel: 10, // 每级消耗的强化石数量
  statIncrease: 0.1 // 每级属性提升比例（10%）
}

// 洗练配置
const reforgeConfig = {
  costPerAttempt: 10, // 每次洗练消耗的洗练石数量
  minVariation: -0.3, // 最小属性变化（-30%）
  maxVariation: 0.3, // 最大属性变化（+30%）
  newStatChance: 0.3 // 更换属性的概率（30%）
}

export const focusCost = 5
const basicGains: Stats = { attack: 4, defense: 5, health: 65, speed: 4 }

export function focusPreview(player: PlayerState & { effectBonuses: Stats }, item: Equipment, stat: string) {
  if (!Object.hasOwn(item.stats, stat) || !Object.hasOwn(player.artifactBonuses, stat)) return null
  const quality = isEquipmentQuality(item.quality) ? equipmentQualities[item.quality].statMod : 1
  const level = Math.max(player.level, item.level ?? 1)
  const scale = quality * (1 + level * 0.1) * 1.1 ** Math.min(enhanceConfig.maxLevel, item.enhanceLevel ?? 0)
  const before = item.stats[stat]
  let after = roundEquipmentStat(item.type, stat, before + (basicGains[stat] ?? 0.014) * scale)
  const worn = player.equippedArtifacts[item.type]?.stats[stat] ?? 0
  const chance = player.combatAttributes[stat] ?? player.combatResistance[stat]
  const reduction = stat === 'finalDamageReduce' || stat === 'critDamageReduce'
  if (chance !== undefined || reduction) {
    const base = chance ?? player.specialAttributes[stat]
    const limit = reduction ? 1 : 1 / (1 + (player.effectBonuses.allAttributes ?? 0))
    const room = Math.floor((limit - base + worn + 1e-9) * 10000) / 10000
    after = Math.min(after, room)
  }
  after = Math.max(before, after)
  const changes = (n: number) => projectedChanges(player, player.effectBonuses, { [stat]: n }, { [stat]: worn })
  const power = Number((battlePoints(changes(after), 2) - battlePoints(changes(before), 2)).toFixed(2))
  return { stat, before, after, power }
}

export function claimFirstReforgeReward(player: { refinementStones: number; firstReforgeRewardClaimed: boolean }): number {
  if (player.firstReforgeRewardClaimed) return 0
  const bonus = Math.max(0, reforgeConfig.costPerAttempt - player.refinementStones)
  player.refinementStones += bonus
  player.firstReforgeRewardClaimed = true
  return bonus
}

// 可洗练的属性池
const reforgeableStats: Record<EquipmentSlot, string[]> = {
  weapon: ['attack', 'critRate', 'critDamageBoost'],
  head: ['defense', 'health', 'stunResist'],
  body: ['defense', 'health', 'finalDamageReduce', 'counterRate', 'combatBoost'],
  feet: ['defense', 'speed', 'dodgeRate'],
  wrist: ['defense', 'counterRate', 'vampireRate'],
  necklace: ['health', 'healBoost', 'spiritRate'],
  ring: ['attack', 'critDamageBoost', 'finalDamageBoost'],
  artifact: ['attack', 'critRate', 'comboRate']
}

export function enhancementPreview(equipment: Equipment) {
  const level = equipment.enhanceLevel ?? 0
  if (level >= enhanceConfig.maxLevel) return null
  const successRate = Math.max(enhanceConfig.minimumSuccessRate, enhanceConfig.baseSuccessRate - level * 0.05)
  const stats: Stats = {}
  for (const [stat, value] of Object.entries(equipment.stats)) {
    stats[stat] = roundEquipmentStat(equipment.type, stat, value * (1 + enhanceConfig.statIncrease))
  }
  const nextLevel = level + 1
  return { nextLevel, successRate, cost: enhanceConfig.costPerLevel * nextLevel, stats }
}

function enhanceEquipment(equipment: Equipment | null, playerReinforceStones: number, random = Math.random): EquipmentChangeResult {
  if (!equipment?.stats) return { success: false, message: '无效的装备' }
  const preview = enhancementPreview(equipment)
  if (!preview) return { success: false, message: '装备已达到最大强化等级' }
  if (playerReinforceStones < preview.cost) return { success: false, message: '强化石不足' }
  if (random() >= preview.successRate) return { success: false, cost: 0, message: '强化未成功，强化石已保留。' }
  const oldStats = { ...equipment.stats }
  equipment.stats = preview.stats
  equipment.enhanceLevel = preview.nextLevel
  return { success: true, message: '强化成功', cost: preview.cost, oldStats, newStats: preview.stats, newLevel: preview.nextLevel }
}

function reforgeEquipment(equipment: Equipment | null, playerSpiritStones: number, confirmNewStats = true): EquipmentChangeResult {
  if (!equipment || !equipment.stats || !equipment.type) {
    return { success: false, message: '无效的装备' }
  }
  if (playerSpiritStones < reforgeConfig.costPerAttempt) {
    return { success: false, message: '洗练石不足' }
  }
  const oldStats = { ...equipment.stats }
  const availableStats = equipment.type === 'ring' || equipment.type === 'wrist'
    ? Object.keys(equipment.stats) : reforgeableStats[equipment.type]
  const tempStats = { ...equipment.stats }
  const originStats = Object.keys(tempStats)
  // 生成要处理的属性索引（1-3个随机）
  const modifyIndexes = [
    ...new Set(
      Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => Math.floor(Math.random() * originStats.length))
    )
  ].slice(0, 3) // 确保最多处理3个属性
  modifyIndexes.forEach(index => {
    const originStat = originStats[index]
    let currentStat = originStat
    const baseValue = tempStats[originStat]
    // Step 1: 尝试替换属性
    if (Math.random() < reforgeConfig.newStatChance) {
      // 过滤可用属性（不包含现有属性）
      const availableNew = availableStats.filter(s => !(s in tempStats) && isPercentageStat(s) === isPercentageStat(originStat))
      if (availableNew.length > 0) {
        const newStat = availableNew[Math.floor(Math.random() * availableNew.length)]
        // 替换属性名但保留当前数值（会在步骤2中调整）
        delete tempStats[originStat]
        currentStat = newStat
      }
    }
    // Step 2：强制数值调整（基于原始值±30%）
    const delta = Math.random() * 0.6 - 0.3 // [-0.3, 0.3]
    const newValue = baseValue * (1 + delta)
    tempStats[currentStat] = roundEquipmentStat(equipment.type, currentStat, newValue)
  })
  // 强制属性数量校验
  if (Object.keys(tempStats).length !== originStats.length) {
    console.error('属性数量异常', { old: originStats, new: tempStats })
    return {
      success: false,
      message: '洗练过程出现异常',
      cost: 0,
      oldStats,
      newStats: oldStats
    }
  }
  if (confirmNewStats) {
    equipment.stats = { ...tempStats }
  }
  return {
    success: true,
    message: confirmNewStats ? '洗练成功' : '保留原有属性',
    cost: reforgeConfig.costPerAttempt,
    oldStats,
    newStats: tempStats,
    confirmed: confirmNewStats
  }
}

export { enhanceConfig, reforgeConfig, reforgeableStats, enhanceEquipment, reforgeEquipment }
