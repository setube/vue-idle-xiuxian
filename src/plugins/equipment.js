// 装备强化和洗练相关配置

// 强化等级配置
const enhanceConfig = {
  maxLevel: 10,  // 最大强化等级
  baseSuccessRate: 0.95,  // 基础成功率
  costPerLevel: 10,  // 每级消耗的强化石数量
  statIncrease: 0.1,  // 每级属性提升比例（10%）
}

// 洗练配置
const reforgeConfig = {
  costPerAttempt: 50,  // 每次洗练消耗的灵石数量
  minVariation: -0.3,  // 最小属性变化（-30%）
  maxVariation: 0.3,   // 最大属性变化（+30%）
  newStatChance: 0.3,  // 更换属性的概率（30%）
}

// 可洗练的属性池
const reforgeableStats = {
  weapon: ['attack', 'critRate', 'critDamageBoost'],
  head: ['defense', 'health', 'stunResist'],
  body: ['defense', 'health', 'finalDamageReduce'],
  legs: ['defense', 'speed', 'dodgeRate'],
  feet: ['defense', 'speed', 'dodgeRate'],
  shoulder: ['defense', 'health', 'counterRate'],
  hands: ['attack', 'critRate', 'comboRate'],
  wrist: ['defense', 'counterRate', 'vampireRate'],
  necklace: ['health', 'healBoost', 'spiritRate'],
  ring1: ['attack', 'critDamageBoost', 'finalDamageBoost'],
  ring2: ['defense', 'critDamageReduce', 'resistanceBoost'],
  belt: ['health', 'defense', 'combatBoost'],
  artifact: ['cultivationRate', 'spiritRate', 'luck']
}

// 强化装备
function enhanceEquipment (equipment, playerReinforceStones) {
  if (!equipment || !equipment.stats) {
    return { success: false, message: '无效的装备' }
  }
  const currentLevel = equipment.enhanceLevel || 0
  if (currentLevel >= enhanceConfig.maxLevel) {
    return { success: false, message: '装备已达到最大强化等级' }
  }
  const cost = enhanceConfig.costPerLevel * (currentLevel + 1)
  if (playerReinforceStones < cost) {
    return { success: false, message: '强化石不足' }
  }
  // 计算成功率
  const successRate = enhanceConfig.baseSuccessRate - (currentLevel * 0.05)
  const isSuccess = Math.random() < successRate
  if (!isSuccess) {
    return {
      success: false,
      message: '强化失败',
      cost,
      oldStats: { ...equipment.stats },
      newStats: { ...equipment.stats }
    }
  }
  // 保存旧属性用于对比
  const oldStats = { ...equipment.stats }
  // 提升装备属性
  Object.keys(equipment.stats).forEach(stat => {
    if (typeof equipment.stats[stat] === 'number') {
      equipment.stats[stat] *= (1 + enhanceConfig.statIncrease)
      // 对百分比属性进行特殊处理
      if (['critRate', 'critDamageBoost', 'dodgeRate', 'vampireRate',
        'finalDamageBoost', 'finalDamageReduce'].includes(stat)) {
        equipment.stats[stat] = Math.round(equipment.stats[stat] * 100) / 100
      } else {
        equipment.stats[stat] = Math.round(equipment.stats[stat])
      }
    }
  })
  // 更新强化等级
  equipment.enhanceLevel = (equipment.enhanceLevel || 0) + 1
  return {
    success: true,
    message: '强化成功',
    cost,
    oldStats,
    newStats: equipment.stats,
    newLevel: equipment.enhanceLevel
  }
}

function reforgeEquipment (equipment, playerSpiritStones, confirmNewStats = true) {
  if (!equipment || !equipment.stats || !equipment.type) {
    return { success: false, message: '无效的装备' }
  }
  if (playerSpiritStones < reforgeConfig.costPerAttempt) {
    return { success: false, message: '灵石不足' }
  }
  const oldStats = { ...equipment.stats }
  const availableStats = reforgeableStats[equipment.type]
  const tempStats = { ...equipment.stats }
  const originStats = Object.keys(tempStats)
  // 生成要处理的属性索引（1-3个随机）
  const modifyIndexes = [...new Set(
    Array.from({ length: Math.floor(Math.random() * 3) + 1 },
      () => Math.floor(Math.random() * originStats.length))
  )].slice(0, 3) // 确保最多处理3个属性
  modifyIndexes.forEach(index => {
    const originStat = originStats[index]
    let currentStat = originStat
    const baseValue = tempStats[originStat]
    // Step 1: 尝试替换属性
    if (Math.random() < reforgeConfig.newStatChance) {
      // 过滤可用属性（不包含现有属性）
      const availableNew = availableStats.filter(s =>
        !originStats.includes(s) && s !== originStat
      )
      if (availableNew.length > 0) {
        const newStat = availableNew[Math.floor(Math.random() * availableNew.length)]
        // 替换属性名但保留当前数值（会在步骤2中调整）
        delete tempStats[originStat]
        currentStat = newStat
      }
    }
    // Step 2：强制数值调整（基于原始值±30%）
    const delta = (Math.random() * 0.6 - 0.3) // [-0.3, 0.3]
    const newValue = baseValue * (1 + delta)
    // 根据属性类型处理数值精度
    if (['critRate', 'critDamageBoost', 'dodgeRate', 'vampireRate',
      'finalDamageBoost', 'finalDamageReduce'].includes(currentStat)) {
      tempStats[currentStat] = Math.min(Math.max(
        Number(newValue.toFixed(2)),
        baseValue * 0.7
      ), baseValue * 1.3)
    } else {
      tempStats[currentStat] = Math.min(Math.max(
        Math.round(newValue),
        Math.round(baseValue * 0.7)
      ), Math.round(baseValue * 1.3))
    }
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

export {
  enhanceConfig,
  reforgeConfig,
  reforgeableStats,
  enhanceEquipment,
  reforgeEquipment
}