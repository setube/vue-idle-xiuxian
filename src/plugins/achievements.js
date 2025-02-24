const equipmentTypes = {
  weapon: '武器',
  head: '头部',
  body: '衣服',
  legs: '裤子',
  feet: '鞋子',
  shoulder: '肩甲',
  hands: '手套',
  wrist: '护腕',
  necklace: '项链',
  ring1: '戒指1',
  ring2: '戒指2',
  belt: '腰带',
  artifact: '法宝'
}

// 成就系统配置
export const achievements = {
  // 装备成就
  equipment: [
    {
      id: 'equipment_1', name: '初获装备', description: '获得第一件装备', condition: (player) => {
        const equippedCount = Object.values(player.equippedArtifacts).filter(e => e !== null).length;
        const inventoryCount = player.equipment?.length || 0;
        return (equippedCount + inventoryCount) >= 1;
      }, reward: { spirit: 200 }
    },
    {
      id: 'equipment_2', name: '装备收藏', description: '拥有10件装备', condition: (player) => {
        const equippedCount = Object.values(player.equippedArtifacts).filter(e => e !== null).length;
        const inventoryCount = player.equipment?.length || 0;
        return (equippedCount + inventoryCount) >= 10;
      }, reward: { spirit: 1000 }
    },
    {
      id: 'equipment_3', name: '装备大师', description: '拥有一件极品品质装备', condition: (player) => {
        const equippedLegendary = Object.values(player.equippedArtifacts).some(e => e?.quality === 'legendary');
        const inventoryLegendary = player.equipment?.some(e => e.quality === 'legendary');
        return equippedLegendary || inventoryLegendary;
      }, reward: { spirit: 3000, damage: 1.2 }
    },
    {
      id: 'equipment_4', name: '炼器宗师', description: '强化任意装备到+10', condition: (player) => {
        const equippedEnhanced = Object.values(player.equippedArtifacts).some(e => e?.enhanceLevel >= 10);
        const inventoryEnhanced = player.equipment?.some(e => e.enhanceLevel >= 10);
        return equippedEnhanced || inventoryEnhanced;
      }, reward: { spirit: 5000, damage: 1.5 }
    },
    {
      id: 'equipment_5', name: '装备之王', description: '拥有一套完整的极品装备', condition: (player) => {
        const allEquipment = [...Object.values(player.equippedArtifacts).filter(e => e !== null), ...(player.equipment || [])];
        const legendaryTypes = new Set(allEquipment.filter(e => e.quality === 'legendary').map(e => e.type));
        return legendaryTypes.size >= 4;
      }, reward: { spirit: 10000, damage: 2, defense: 2 }
    },
    {
      id: 'equipment_6', name: '炼器新秀', description: '初次强化装备', condition: (player) => {
        const equippedEnhanced = Object.values(player.equippedArtifacts).some(e => e?.enhanceLevel > 0);
        const inventoryEnhanced = player.equipment?.some(e => e.enhanceLevel > 0);
        return equippedEnhanced || inventoryEnhanced;
      }, reward: { spirit: 500 }
    },
    {
      id: 'equipment_7', name: '装备鉴赏家', description: '拥有20件不同部位的装备', condition: (player) => {
        const allEquipment = [...Object.values(player.equippedArtifacts).filter(e => e !== null), ...(player.equipment || [])];
        return new Set(allEquipment.map(e => e.type)).size >= 10;
      }, reward: { spirit: 2000 }
    },
    {
      id: 'equipment_8', name: '神装收集者', description: '拥有5件仙品装备', condition: (player) => {
        const equippedMythic = Object.values(player.equippedArtifacts).filter(e => e?.quality === 'mythic').length;
        const inventoryMythic = (player.equipment || []).filter(e => e.quality === 'mythic').length;
        return (equippedMythic + inventoryMythic) >= 5;
      }, reward: { spirit: 10000, damage: 1.5 }
    },
    {
      id: 'equipment_9', name: '强化大师', description: '将一件装备强化到+15', condition: (player) => {
        const equippedEnhanced = Object.values(player.equippedArtifacts).some(e => e?.enhanceLevel >= 15);
        const inventoryEnhanced = player.equipment?.some(e => e.enhanceLevel >= 15);
        return equippedEnhanced || inventoryEnhanced;
      }, reward: { spirit: 20000, damage: 2 }
    },
    {
      id: 'equipment_10', name: '全能装备师', description: '拥有每部位一件仙品装备', condition: (player) => {
        const allEquipment = [...Object.values(player.equippedArtifacts).filter(e => e !== null), ...(player.equipment || [])];
        const mythicTypes = new Set(allEquipment.filter(e => e.quality === 'mythic').map(e => e.type));
        return mythicTypes.size >= Object.keys(equipmentTypes).length;
      }, reward: { spirit: 50000, damage: 3, defense: 3 }
    }
  ],

  // 秘境探索成就
  dungeon_explore: [
    { id: 'dungeon_1', name: '初探秘境', description: '首次进入秘境', condition: (player) => player.dungeonTotalRuns >= 1, reward: { spirit: 200, damage: 1 } },
    { id: 'dungeon_2', name: '秘境先驱者', description: '通过第5层秘境', condition: (player) => player.dungeonHighestFloor >= 5, reward: { spirit: 500, damage: 1.1 } },
    { id: 'dungeon_3', name: '秘境探索者', description: '通过第10层秘境', condition: (player) => player.dungeonHighestFloor >= 10, reward: { spirit: 1000, damage: 1.2 } },
    { id: 'dungeon_4', name: '秘境探险家', description: '通过第20层秘境', condition: (player) => player.dungeonHighestFloor >= 20, reward: { spirit: 2000, damage: 1.3 } },
    { id: 'dungeon_5', name: '秘境猎手', description: '通过第30层秘境', condition: (player) => player.dungeonHighestFloor >= 30, reward: { spirit: 5000, damage: 1.4 } },
    { id: 'dungeon_6', name: '秘境征服者', description: '通过第50层秘境', condition: (player) => player.dungeonHighestFloor >= 50, reward: { spirit: 5000, damage: 1.5 } },
    { id: 'dungeon_7', name: '秘境征服者', description: '通过第75层秘境', condition: (player) => player.dungeonHighestFloor >= 75, reward: { spirit: 15000, damage: 1.6 } },
    { id: 'dungeon_8', name: '秘境王者', description: '通过第100层秘境', condition: (player) => player.dungeonHighestFloor >= 100, reward: { spirit: 20000, damage: 1.7 } },
    { id: 'dungeon_9', name: '秘境传奇', description: '通过第150层秘境', condition: (player) => player.dungeonHighestFloor >= 150, reward: { spirit: 30000, damage: 1.8 } },
    { id: 'dungeon_10', name: '秘境之主', description: '通过第200层秘境', condition: (player) => player.dungeonHighestFloor >= 200, reward: { spirit: 50000, damage: 2 } }
  ],

  // 秘境战斗成就
  dungeon_combat: [
    { id: 'dungeon_combat_1', name: '初战告捷', description: '击杀10个普通敌人', condition: (player) => player.dungeonTotalKills >= 10, reward: { spirit: 500, defense: 1 } },
    { id: 'dungeon_combat_2', name: '战无不胜', description: '击杀50个普通敌人', condition: (player) => player.dungeonStreakKills >= 50, reward: { spirit: 2000, defense: 1.1 } },
    { id: 'dungeon_combat_3', name: '百战不殆', description: '击杀100个普通敌人', condition: (player) => player.dungeonTotalKills >= 100, reward: { spirit: 2000, defense: 1.2 } },
    { id: 'dungeon_combat_4', name: '收割者', description: '击杀500个普通敌人', condition: (player) => player.dungeonTotalKills >= 500, reward: { spirit: 3000, defense: 1.3 } },
    { id: 'dungeon_combat_5', name: '精英猎手', description: '击杀50个精英敌人', condition: (player) => player.dungeonEliteKills >= 50, reward: { spirit: 5000, defense: 1 } },
    { id: 'dungeon_combat_6', name: 'BOSS终结者', description: '击杀10个BOSS', condition: (player) => player.dungeonBossKills >= 10, reward: { spirit: 10000, defense: 1.5 } },
    { id: 'dungeon_combat_7', name: 'BOSS猎人', description: '击杀50个BOSS', condition: (player) => player.dungeonBossKills >= 50, reward: { spirit: 10000, defense: 2 } },
    { id: 'dungeon_combat_8', name: '秘境终结者', description: '击杀100个BOSS', condition: (player) => player.dungeonBossKills >= 100, reward: { spirit: 20000, defense: 2.5 } },
    { id: 'dungeon_combat_9', name: '无敌战神', description: '总击杀数达到1000', condition: (player) => player.dungeonTotalKills >= 1000, reward: { spirit: 30000, defense: 2 } },
    { id: 'dungeon_combat_10', name: '无尽战神', description: '总击杀数达到10000', condition: (player) => player.dungeonTotalKills >= 10000, reward: { spirit: 50000, defense: 2.5 } },
  ],

  // 修为成就
  cultivation: [
    { id: 'cultivation_1', name: '初入修仙', description: '开始踏上修仙之路', condition: (player) => player.totalCultivationTime > 0, reward: { spirit: 100 } },
    { id: 'cultivation_2', name: '修炼入门', description: '累计修炼时间达到30分钟', condition: (player) => player.totalCultivationTime >= 1800, reward: { spirit: 300 } },
    { id: 'cultivation_3', name: '勤修苦练', description: '累计修炼时间达到1小时', condition: (player) => player.totalCultivationTime >= 3600, reward: { spirit: 500 } },
    { id: 'cultivation_4', name: '修炼小有所成', description: '累计修炼时间达到12小时', condition: (player) => player.totalCultivationTime >= 43200, reward: { spirit: 1000 } },
    { id: 'cultivation_5', name: '修炼狂人', description: '累计修炼时间达到48小时', condition: (player) => player.totalCultivationTime >= 172800, reward: { spirit: 3000 } },
    { id: 'cultivation_6', name: '修炼成痴', description: '累计修炼时间达到24小时', condition: (player) => player.totalCultivationTime >= 86400, reward: { spirit: 2000 } },
    { id: 'cultivation_7', name: '道心稳固', description: '累计修炼时间达到7天', condition: (player) => player.totalCultivationTime >= 604800, reward: { spirit: 5000, spiritRate: 1.1 } },
    { id: 'cultivation_8', name: '修炼大成', description: '累计修炼时间达到15天', condition: (player) => player.totalCultivationTime >= 1296000, reward: { spirit: 10000, spiritRate: 1.2 } },
    { id: 'cultivation_9', name: '修仙百年', description: '累计修炼时间达到30天', condition: (player) => player.totalCultivationTime >= 2592000, reward: { spirit: 10000, spiritRate: 1.3 } },
    { id: 'cultivation_10', name: '修炼至尊', description: '累计修炼时间达到100天', condition: (player) => player.totalCultivationTime >= 8640000, reward: { spirit: 50000, spiritRate: 2 } }
  ],

  // 突破成就
  breakthrough: [
    { id: 'breakthrough_1', name: '初窥门径', description: '首次突破', condition: (player) => player.breakthroughCount >= 1, reward: { spirit: 200 } },
    { id: 'breakthrough_2', name: '突破新秀', description: '首次突破成功', condition: (player) => player.breakthroughCount >= 5, reward: { spirit: 500 } },
    { id: 'breakthrough_3', name: '修炼有成', description: '突破次数达到10次', condition: (player) => player.breakthroughCount >= 10, reward: { spirit: 1000 } },
    { id: 'breakthrough_4', name: '道法自然', description: '突破次数达到50次', condition: (player) => player.breakthroughCount >= 50, reward: { spirit: 5000 } },
    { id: 'breakthrough_5', name: '登峰造极', description: '突破次数达到100次', condition: (player) => player.breakthroughCount >= 100, reward: { spirit: 10000, spiritRate: 1.2 } },
    { id: 'breakthrough_6', name: '问鼎巅峰', description: '达到化神境界', condition: (player) => player.level >= 37, reward: { spirit: 50000, spiritRate: 1 } },
    { id: 'breakthrough_7', name: '突破达人', description: '达到返虚境界', condition: (player) => player.level >= 46, reward: { spirit: 100000, spiritRate: 1.2 } },
    { id: 'breakthrough_8', name: '突破宗师', description: '达到大乘境界', condition: (player) => player.level >= 64, reward: { spirit: 200000, spiritRate: 1.5 } },
    { id: 'breakthrough_9', name: '突破至尊', description: '达到仙人境界', condition: (player) => player.level >= 82, reward: { spirit: 300000, spiritRate: 1.7 } },
    { id: 'breakthrough_10', name: '突破之神', description: '达到大罗境界', condition: (player) => player.level >= 126, reward: { spirit: 500000, spiritRate: 2 } }
  ],

  // 探索成就
  exploration: [
    { id: 'exploration_1', name: '初探世界', description: '首次进行探索', condition: (player) => player.explorationCount >= 1, reward: { spirit: 100 } },
    { id: 'exploration_2', name: '探索新秀', description: '探索次数达到10次', condition: (player) => player.explorationCount >= 10, reward: { spirit: 300 } },
    { id: 'exploration_3', name: '探索达人', description: '探索次数达到50次', condition: (player) => player.explorationCount >= 50, reward: { spirit: 1000 } },
    { id: 'exploration_4', name: '四处游历', description: '探索次数达到100次', condition: (player) => player.explorationCount >= 100, reward: { spirit: 1000 } },
    { id: 'exploration_5', name: '探索大师', description: '探索次数达到200次', condition: (player) => player.explorationCount >= 200, reward: { spirit: 5000 } },
    { id: 'exploration_6', name: '探索传奇', description: '探索次数达到500次', condition: (player) => player.explorationCount >= 500, reward: { spirit: 15000 } },
    { id: 'exploration_7', name: '游历天下', description: '探索次数达到1000次', condition: (player) => player.explorationCount >= 1000, reward: { spirit: 5000 } },
    { id: 'exploration_8', name: '寻宝达人', description: '获得100件物品', condition: (player) => player.itemsFound >= 100, reward: { spirit: 2000 } },
    { id: 'exploration_9', name: '机缘深厚', description: '触发100次随机事件', condition: (player) => player.eventTriggered >= 100, reward: { spirit: 3000, luck: 1.1 } },
    { id: 'exploration_10', name: '探索之神', description: '触发500次随机事件', condition: (player) => player.eventTriggered >= 500, reward: { spirit: 30000, luck: 1.5 } }

  ],

  // 收集成就
  collection: [
    { id: 'collection_1', name: '初识灵草', description: '收集首株灵草', condition: (player) => player.herbs.length >= 1, reward: { spirit: 100 } },
    { id: 'collection_2', name: '灵草学徒', description: '收集5种不同灵草', condition: (player) => new Set(player.herbs.map(h => h.id)).size >= 5, reward: { spirit: 500 } },
    { id: 'collection_3', name: '灵草收藏家', description: '收集10种不同灵草', condition: (player) => new Set(player.herbs.map(h => h.id)).size >= 10, reward: { spirit: 1000 } },
    { id: 'collection_4', name: '灵草猎人', description: '收集50株灵草', condition: (player) => player.herbs.length >= 50, reward: { spirit: 2000, herbRate: 1 } },
    { id: 'collection_5', name: '灵草园主', description: '拥有100株灵草', condition: (player) => player.herbs.length >= 100, reward: { spirit: 5000, herbRate: 1.5 } },
    { id: 'collection_6', name: '灵草之巅', description: '收集200株灵草', condition: (player) => player.herbs.length >= 200, reward: { spirit: 30000, herbRate: 2 } },
    { id: 'collection_7', name: '仙品收藏', description: '收集100个稀有灵草', condition: (player) => player.herbs.filter(h => h.quality === 'rare').length >= 100, reward: { spirit: 2000, herbRate: 1 } },
    { id: 'collection_8', name: '灵草大师', description: '收集100株极品灵草', condition: (player) => player.herbs.filter(h => h.quality === 'epic').length >= 100, reward: { spirit: 5000, herbRate: 1.3 } },
    { id: 'collection_9', name: '仙草收集者', description: '收集100株仙品灵草', condition: (player) => player.herbs.filter(h => h.quality === 'mythic').length >= 100, reward: { spirit: 10000, herbRate: 1.5 } },
    { id: 'collection_10', name: '灵草大师', description: '收集所有种类灵草', condition: (player) => new Set(player.herbs.map(h => h.id)).size >= 15, reward: { spirit: 3000, herbRate: 1.2 } },
  ],

  // 资源成就
  resources: [
    { id: 'resources_1', name: '初获灵石', description: '获得首枚灵石', condition: (player) => player.spiritStones >= 1, reward: { spirit: 100 } },
    { id: 'resources_2', name: '小有积蓄', description: '灵石数量达到1000', condition: (player) => player.spiritStones >= 1000, reward: { spirit: 1000 } },
    { id: 'resources_3', name: '灵石新人', description: '灵石数量达到5000', condition: (player) => player.spiritStones >= 5000, reward: { spirit: 2000 } },
    { id: 'resources_4', name: '富甲一方', description: '灵石数量达到10000', condition: (player) => player.spiritStones >= 10000, reward: { spirit: 5000 } },
    { id: 'resources_5', name: '灵石达人', description: '灵石数量达到50000', condition: (player) => player.spiritStones >= 50000, reward: { spirit: 10000 } },
    { id: 'resources_6', name: '富可敌国', description: '灵石数量达到100000', condition: (player) => player.spiritStones >= 100000, reward: { spirit: 20000, spiritRate: 1.3 } },
    { id: 'resources_7', name: '灵石大师', description: '灵石数量达到500000', condition: (player) => player.spiritStones >= 500000, reward: { spirit: 10000, spiritRate: 1.5 } },
    { id: 'resources_8', name: '坐拥灵山', description: '灵石数量达到1000000', condition: (player) => player.spiritStones >= 1000000, reward: { spirit: 100000, spiritRate: 2 } },
    { id: 'resources_9', name: '灵石传奇', description: '灵石数量达到5000000', condition: (player) => player.spiritStones >= 5000000, reward: { spirit: 30000, spiritRate: 2.3 } },
    { id: 'resources_10', name: '灵石之神', description: '灵石数量达到10000000', condition: (player) => player.spiritStones >= 10000000, reward: { spirit: 100000, spiritRate: 2.5 } }
  ],

  // 炼丹成就
  alchemy: [
    { id: 'alchemy_1', name: '初识丹道', description: '首次成功炼制丹药', condition: (player) => player.pillsCrafted >= 1, reward: { spirit: 200 } },
    { id: 'alchemy_2', name: '炼丹学徒', description: '成功炼制5颗丹药', condition: (player) => player.pillsCrafted >= 5, reward: { spirit: 500 } },
    { id: 'alchemy_3', name: '丹道小成', description: '成功炼制10颗丹药', condition: (player) => player.pillsCrafted >= 10, reward: { spirit: 1000 } },
    { id: 'alchemy_4', name: '炼丹达人', description: '成功炼制50颗丹药', condition: (player) => player.pillsCrafted >= 50, reward: { spirit: 2000 } },
    { id: 'alchemy_5', name: '丹道精通', description: '成功炼制100颗丹药', condition: (player) => player.pillsCrafted >= 100, reward: { spirit: 5000, alchemyRate: 1.2 } },
    { id: 'alchemy_6', name: '炼丹大师', description: '成功炼制500颗丹药', condition: (player) => player.pillsCrafted >= 500, reward: { spirit: 10000, alchemyRate: 1.3 } },
    { id: 'alchemy_7', name: '丹道宗师', description: '炼制1000颗丹药', condition: (player) => player.pillsCrafted >= 1000, reward: { spirit: 50000, alchemyRate: 2 } },
    { id: 'alchemy_8', name: '丹道之神', description: '炼制10000颗丹药', condition: (player) => player.pillsCrafted >= 10000, reward: { spirit: 50000, alchemyRate: 2.5 } },
    { id: 'alchemy_9', name: '丹道大师', description: '获得所有丹方', condition: (player) => player.unlockedPillRecipes >= 8, reward: { spirit: 10000, alchemyRate: 1.5 } },
    { id: 'alchemy_10', name: '仙丹炼师', description: '炼制100颗仙品丹药', condition: (player) => player.highQualityPillsCrafted >= 100, reward: { spirit: 30000, alchemyRate: 1.5 } }
  ]
}

// 检查成就完成情况并发放奖励
export const checkAchievements = (player) => {
  const completedAchievements = []

  // 遍历所有成就类别
  Object.values(achievements).forEach(category => {
    category.forEach(achievement => {
      // 检查成就是否已完成且未记录
      if (achievement.condition(player) &&
        !player.completedAchievements?.includes(achievement.id)) {
        completedAchievements.push(achievement)
        // 添加到已完成成就列表
        if (!player.completedAchievements) {
          player.completedAchievements = []
        }
        player.completedAchievements.push(achievement.id)
        // 发放成就奖励
        if (achievement.reward) {
          if (achievement.reward.spirit) {
            player.spirit += achievement.reward.spirit
          }
          if (achievement.reward.spiritRate) {
            player.spiritRate *= achievement.reward.spiritRate
          }
          if (achievement.reward.herbRate) {
            player.herbRate = (player.herbRate || 1) * achievement.reward.herbRate
          }
          if (achievement.reward.alchemyRate) {
            player.alchemyRate = (player.alchemyRate || 1) * achievement.reward.alchemyRate
          }
          if (achievement.reward.luck) {
            player.luck = (player.luck || 1) * achievement.reward.luck
          }
        }
        // 保存玩家数据
        player.saveData()
      }
    })
  })

  return completedAchievements
}

// 计算成就进度
export const getAchievementProgress = (player, achievement) => {
  try {
    // 如果已完成，返回100%
    if (player.completedAchievements?.includes(achievement.id)) {
      return 100
    }
    // 根据不同类型的成就计算进度
    if (achievement.id.startsWith('dungeon_1')) {
      return Math.min(100, ((player.dungeonTotalRuns || 0) / 1) * 100)
    } else if (achievement.id.startsWith('dungeon_')) {
      const matches = achievement.description.match(/\d+/)
      const targetFloor = matches ? parseInt(matches[0]) : 100
      return Math.min(100, ((player.dungeonHighestFloor || 0) / targetFloor) * 100)
    } else if (achievement.id.startsWith('dungeon_combat_')) {
      if (achievement.id === 'dungeon_combat_3') {
        return Math.min(100, ((player.dungeonEliteKills || 0) / 50) * 100)
      } else if (achievement.id === 'dungeon_combat_4') {
        return Math.min(100, ((player.dungeonBossKills || 0) / 10) * 100)
      } else {
        const matches = achievement.description.match(/\d+/)
        const targetKills = matches ? parseInt(matches[0]) : 100
        return Math.min(100, ((player.dungeonTotalKills || 0) / targetKills) * 100)
      }
    } else if (achievement.id.startsWith('cultivation_')) {
      const matches = achievement.condition.toString().match(/(\d+)/)
      const targetTime = matches ? parseInt(matches[0]) : 3600
      return Math.min(100, ((player.totalCultivationTime || 0) / targetTime) * 100)
    } else if (achievement.id.startsWith('breakthrough_')) {
      if (achievement.id === 'breakthrough_5') {
        return Math.min(100, ((player.level || 0) / 37) * 100)
      } else {
        const matches = achievement.description.match(/\d+/)
        const targetCount = matches ? parseInt(matches[0]) : 10
        return Math.min(100, ((player.breakthroughCount || 0) / targetCount) * 100)
      }
    } else if (achievement.id.startsWith('exploration_')) {
      if (achievement.id === 'exploration_4') {
        return Math.min(100, ((player.itemsFound || 0) / 100) * 100)
      } else if (achievement.id === 'exploration_5') {
        return Math.min(100, ((player.eventTriggered || 0) / 100) * 100)
      } else {
        const matches = achievement.description.match(/\d+/)
        const targetCount = matches ? parseInt(matches[0]) : 100
        return Math.min(100, ((player.explorationCount || 0) / targetCount) * 100)
      }
    } else if (achievement.id.startsWith('collection_')) {
      if (achievement.id === 'collection_1') {
        return (player.herbs || []).length >= 1 ? 100 : 0
      } else if (achievement.id === 'collection_2' || achievement.id === 'collection_3') {
        const matches = achievement.description.match(/\d+/)
        const targetTypes = matches ? parseInt(matches[0]) : 10
        const uniqueHerbs = new Set((player.herbs || []).map(h => h.id)).size
        return Math.min(100, (uniqueHerbs / targetTypes) * 100)
      } else if (achievement.id === 'collection_4') {
        return (player.herbs || []).some(h => h.quality === 'legendary') ? 100 : 0
      } else {
        return Math.min(100, ((player.herbs || []).length / 100) * 100)
      }
    } else if (achievement.id.startsWith('resources_')) {
      const matches = achievement.description.match(/\d+/)
      const targetStones = matches ? parseInt(matches[0]) : 1000
      return Math.min(100, ((player.spiritStones || 0) / targetStones) * 100)
    } else if (achievement.id.startsWith('alchemy_')) {
      if (achievement.id === 'alchemy_4') {
        return Math.min(100, ((player.unlockedPillRecipes || 0) / 8) * 100)
      } else {
        const matches = achievement.description.match(/\d+/)
        const targetPills = matches ? parseInt(matches[0]) : 100
        return Math.min(100, ((player.pillsCrafted || 0) / targetPills) * 100)
      }
    }
    return 0
  } catch (error) {
    console.error('成就进度报错:', error)
    return 0
  }
}