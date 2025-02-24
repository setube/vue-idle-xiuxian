// 丹药品阶
export const pillGrades = {
  grade1: { name: '一品', difficulty: 1, successRate: 0.9 },
  grade2: { name: '二品', difficulty: 1.2, successRate: 0.8 },
  grade3: { name: '三品', difficulty: 1.5, successRate: 0.7 },
  grade4: { name: '四品', difficulty: 2, successRate: 0.6 },
  grade5: { name: '五品', difficulty: 2.5, successRate: 0.5 },
  grade6: { name: '六品', difficulty: 3, successRate: 0.4 },
  grade7: { name: '七品', difficulty: 4, successRate: 0.3 },
  grade8: { name: '八品', difficulty: 5, successRate: 0.2 },
  grade9: { name: '九品', difficulty: 6, successRate: 0.1 }
}

// 丹药类型
export const pillTypes = {
  spirit: { name: '灵力类', effectMultiplier: 1 },
  cultivation: { name: '修炼类', effectMultiplier: 1.2 },
  attribute: { name: '属性类', effectMultiplier: 1.5 },
  special: { name: '特殊类', effectMultiplier: 2 }
}

// 根据品阶计算所需残页数量
const getFragmentsNeeded = (grade) => {
  const gradeNumber = parseInt(grade.replace('grade', ''))
  return 5 * gradeNumber + 5  // 一品10个，二品15个，以此类推
}

// 丹方配置
export const pillRecipes = [
  {
    id: 'spirit_gathering',
    name: '聚灵丹',
    description: '提升灵力恢复速度的丹药',
    grade: 'grade1',
    type: 'spirit',
    materials: [
      { herb: 'spirit_grass', count: 2 },
      { herb: 'cloud_flower', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade1'),
    baseEffect: {
      type: 'spiritRate',
      value: 0.2,
      duration: 3600
    }
  },
  {
    id: 'cultivation_boost',
    name: '聚气丹',
    description: '提升修炼速度的丹药',
    grade: 'grade2',
    type: 'cultivation',
    materials: [
      { herb: 'cloud_flower', count: 2 },
      { herb: 'thunder_root', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade2'),
    baseEffect: {
      type: 'cultivationRate',
      value: 0.3,
      duration: 1800
    }
  },
  {
    id: 'thunder_power',
    name: '雷灵丹',
    description: '提升战斗属性的丹药',
    grade: 'grade3',
    type: 'attribute',
    materials: [
      { herb: 'thunder_root', count: 2 },
      { herb: 'dragon_breath_herb', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade3'),
    baseEffect: {
      type: 'combatBoost',
      value: 0.4,
      duration: 900
    }
  },
  {
    id: 'immortal_essence',
    name: '仙灵丹',
    description: '全属性提升的神奇丹药',
    grade: 'grade4',
    type: 'special',
    materials: [
      { herb: 'dragon_breath_herb', count: 2 },
      { herb: 'immortal_jade_grass', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade4'),
    baseEffect: {
      type: 'allAttributes',
      value: 0.5,
      duration: 600
    }
  },
  {
    id: 'five_elements_pill',
    name: '五行丹',
    description: '融合五行之力的神奇丹药，全面提升修炼者素质',
    grade: 'grade5',
    type: 'attribute',
    materials: [
      { herb: 'five_elements_grass', count: 2 },
      { herb: 'phoenix_feather_herb', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade5'),
    baseEffect: {
      type: 'allAttributes',
      value: 0.8,
      duration: 1200
    }
  },
  {
    id: 'celestial_essence_pill',
    name: '天元丹',
    description: '凝聚天地精华的极品丹药，大幅提升修炼速度',
    grade: 'grade6',
    type: 'cultivation',
    materials: [
      { herb: 'celestial_dew_grass', count: 2 },
      { herb: 'moonlight_orchid', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade6'),
    baseEffect: {
      type: 'cultivationRate',
      value: 1.0,
      duration: 1800
    }
  },
  {
    id: 'sun_moon_pill',
    name: '日月丹',
    description: '融合日月精华的丹药，能大幅提升灵力上限',
    grade: 'grade7',
    type: 'spirit',
    materials: [
      { herb: 'sun_essence_flower', count: 2 },
      { herb: 'moonlight_orchid', count: 2 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade7'),
    baseEffect: {
      type: 'spiritCap',
      value: 1.5,
      duration: 2400
    }
  },
  {
    id: 'phoenix_rebirth_pill',
    name: '涅槃丹',
    description: '蕴含不死凤凰之力的神丹，能在战斗中自动恢复生命',
    grade: 'grade8',
    type: 'special',
    materials: [
      { herb: 'phoenix_feather_herb', count: 3 },
      { herb: 'celestial_dew_grass', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade8'),
    baseEffect: {
      type: 'autoHeal',
      value: 0.1,
      duration: 3600
    }
  },
  {
    id: 'spirit_recovery',
    name: '回灵丹',
    description: '快速恢复灵力的丹药',
    grade: 'grade2',
    type: 'spirit',
    materials: [
      { herb: 'dark_yin_grass', count: 2 },
      { herb: 'frost_lotus', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade2'),
    baseEffect: {
      type: 'spiritRecovery',
      value: 0.4,
      duration: 1200
    }
  },
  {
    id: 'essence_condensation',
    name: '凝元丹',
    description: '提升修炼效率的高级丹药',
    grade: 'grade3',
    type: 'cultivation',
    materials: [
      { herb: 'nine_leaf_lingzhi', count: 2 },
      { herb: 'purple_ginseng', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade3'),
    baseEffect: {
      type: 'cultivationEfficiency',
      value: 0.5,
      duration: 1500
    }
  },
  {
    id: 'mind_clarity',
    name: '清心丹',
    description: '提升心境和悟性的丹药',
    grade: 'grade3',
    type: 'special',
    materials: [
      { herb: 'frost_lotus', count: 2 },
      { herb: 'fire_heart_flower', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade3'),
    baseEffect: {
      type: 'comprehension',
      value: 0.3,
      duration: 2400
    }
  },
  {
    id: 'fire_essence',
    name: '火元丹',
    description: '提升火属性修炼速度的丹药',
    grade: 'grade4',
    type: 'attribute',
    materials: [
      { herb: 'fire_heart_flower', count: 2 },
      { herb: 'dragon_breath_herb', count: 1 }
    ],
    fragmentsNeeded: getFragmentsNeeded('grade4'),
    baseEffect: {
      type: 'fireAttribute',
      value: 0.6,
      duration: 1800
    }
  }
]

// 计算丹药实际效果（基于玩家境界）
export const calculatePillEffect = (recipe, playerLevel) => {
  const grade = pillGrades[recipe.grade]
  const type = pillTypes[recipe.type]

  // 基础效果随境界提升
  const levelMultiplier = 1 + (playerLevel - 1) * 0.1

  return {
    type: recipe.baseEffect.type,
    value: recipe.baseEffect.value * type.effectMultiplier * levelMultiplier,
    duration: recipe.baseEffect.duration,
    successRate: grade.successRate
  }
}

// 尝试合成丹药
export const tryCreatePill = (recipe, herbs, player, fragments = 0, luck = 1) => {
  // 检查材料是否足够
  for (const material of recipe.materials) {
    const herbCount = herbs.filter(h => h.id === material.herb).length
    if (herbCount < material.count) {
      return { success: false, message: '材料不足' }
    }
  }

  // 检查丹方是否完整（只有在未掌握完整丹方时才检查残页数量）
  if (!player.pillRecipes.includes(recipe.id) && fragments < recipe.fragmentsNeeded) {
    return { success: false, message: '丹方不完整' }
  }

  // 计算成功率（受幸运值影响）
  const grade = pillGrades[recipe.grade]
  if (Math.random() > grade.successRate * luck) {
    return { success: false, message: '炼制失败' }
  }

  return { success: true, message: '炼制成功' }
}