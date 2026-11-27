import type { ExplorationLocation, ExplorationResult } from '../types/game'

// 地点配置
export const locations: ExplorationLocation[] = [
  {
    id: 'newbie_village',
    name: '新手村',
    description: '灵气稀薄的凡人聚集地，适合初入修仙之道的修士。',
    minLevel: 1,
    herbIds: ['spirit_grass', 'cloud_flower', 'thunder_root'],
    spiritCost: 100,
    rewards: [
      { type: 'spirit_stone', chance: 0.3, amount: [1, 3] },
      { type: 'herb', chance: 0.3, amount: [1, 2] },
      { type: 'cultivation', chance: 0.2, amount: [5, 10] },
      { type: 'pill_fragment', chance: 0.2, amount: [1, 1] }
    ]
  },
  // 筑基期地点
  {
    id: 'celestial_mountain',
    name: '天阙峰',
    description: '云雾缭绕的仙山，传说是远古仙人讲道之地。',
    minLevel: 10,
    herbIds: ['dark_yin_grass', 'frost_lotus', 'nine_leaf_lingzhi', 'purple_ginseng'],
    spiritCost: 15000,
    rewards: [
      { type: 'spirit_stone', chance: 0.25, amount: [30, 60] },
      { type: 'herb', chance: 0.3, amount: [15, 25] },
      { type: 'cultivation', chance: 0.25, amount: [150, 300] },
      { type: 'pill_fragment', chance: 0.2, amount: [6, 10] }
    ]
  },
  // 金丹期地点
  {
    id: 'phoenix_valley',
    name: '凤凰谷',
    description: '常年被火焰环绕的神秘山谷，据说有凤凰遗留的道韵。',
    minLevel: 19,
    herbIds: ['fire_heart_flower', 'dragon_breath_herb', 'phoenix_feather_herb'],
    spiritCost: 20000,
    rewards: [
      { type: 'spirit_stone', chance: 0.25, amount: [50, 100] },
      { type: 'herb', chance: 0.3, amount: [20, 35] },
      { type: 'cultivation', chance: 0.25, amount: [250, 500] },
      { type: 'pill_fragment', chance: 0.2, amount: [8, 12] }
    ]
  },
  // 元婴期地点
  {
    id: 'dragon_abyss',
    name: '龙渊',
    description: '深不见底的神秘深渊，蕴含远古真龙的气息。',
    minLevel: 28,
    herbIds: ['immortal_jade_grass', 'moonlight_orchid', 'five_elements_grass'],
    spiritCost: 30000,
    rewards: [
      { type: 'spirit_stone', chance: 0.25, amount: [80, 150] },
      { type: 'herb', chance: 0.3, amount: [30, 50] },
      { type: 'cultivation', chance: 0.25, amount: [400, 800] },
      { type: 'pill_fragment', chance: 0.2, amount: [10, 15] }
    ]
  },
  // 化神期地点
  {
    id: 'immortal_realm',
    name: '仙界入口',
    description: '传说中通往仙界的神秘之地，充满无尽机缘。',
    minLevel: 37,
    herbIds: ['sun_essence_flower', 'celestial_dew_grass', 'phoenix_feather_herb'],
    spiritCost: 50000,
    rewards: [
      { type: 'spirit_stone', chance: 0.25, amount: [150, 300] },
      { type: 'herb', chance: 0.3, amount: [50, 100] },
      { type: 'cultivation', chance: 0.25, amount: [800, 1500] },
      { type: 'pill_fragment', chance: 0.2, amount: [15, 20] }
    ]
  }
]

// 计算实际获取概率（考虑幸运值）
export const calculateRewardChance = (baseChance: number, luck = 1) => {
  return Math.min(baseChance * luck, 1) // 确保概率不超过100%
}

const calculateEventChance = (luck: number) => 0.3 * luck
const calculateRewardMultiplier = (luck: number) => Math.random() < Math.min(1, 0.5 * luck) ? 1.5 : 1

export function rollExploration(playerData: { luck: number }, location: Pick<ExplorationLocation, 'id' | 'spiritCost'>): ExplorationResult {
  const eventTriggered = Math.random() < Math.min(0.5, calculateEventChance(playerData.luck))
  return {
    type: 'exploration_result',
    locationId: location.id,
    eventTriggered,
    rewardMultiplier: eventTriggered ? 1 : calculateRewardMultiplier(playerData.luck),
    spiritCost: location.spiritCost
  }
}
