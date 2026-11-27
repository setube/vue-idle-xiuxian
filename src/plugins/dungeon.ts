import type { CombatStats } from './combat'
import type { Stats } from '../types/game'

export interface DungeonTarget { stats?: CombatStats; baseAttributes?: Stats; combatAttributes?: Stats; specialAttributes?: Stats }
export type DungeonOptionQuality = 'common' | 'rare' | 'epic'
export interface DungeonOption { id: string; name: string; description: string; effect: (player: DungeonTarget) => void; type?: DungeonOptionQuality }

// 副本难度配置
const difficultyModifiers = {
  easy: { healthMod: 0.8, damageMod: 0.8, rewardMod: 0.8 },
  normal: { healthMod: 1.0, damageMod: 1.0, rewardMod: 1.0 },
  hard: { healthMod: 1.2, damageMod: 1.2, rewardMod: 1.5 },
  expert: { healthMod: 1.5, damageMod: 1.5, rewardMod: 2.0 }
}

// 随机选项池
const roguelikeOptions: Record<DungeonOptionQuality, DungeonOption[]> = {
  common: [
    {
      id: 'heal',
      name: '气血增加',
      description: '增加10%血量',
      effect: player => {
        if (player.stats) {
          player.stats.maxHealth = (player.stats.maxHealth || 100) * 1.1
          player.stats.health = Math.min(player.stats.maxHealth, player.stats.health + player.stats.maxHealth * 0.1)
        }
      }
    },
    {
      id: 'small_buff',
      name: '小幅强化',
      description: '增加10%伤害',
      effect: player => {
        if (player.stats) {
          player.stats.finalDamageBoost = (player.stats.finalDamageBoost || 0) + 0.1
        }
      }
    },
    {
      id: 'defense_boost',
      name: '铁壁',
      description: '提升20%防御力',
      effect: player => {
        if (player.stats) {
          player.stats.defense = (player.stats.defense || 5) * 1.2
        }
      }
    },
    {
      id: 'speed_boost',
      name: '疾风',
      description: '提升15%速度',
      effect: player => {
        if (player.stats) {
          player.stats.speed = (player.stats.speed || 10) * 1.15
        }
      }
    },
    {
      id: 'crit_boost',
      name: '会心',
      description: '提升15%暴击率',
      effect: player => {
        if (player.stats) {
          player.stats.critRate = (player.stats.critRate || 0.05) + 0.15
        }
      }
    },
    {
      id: 'dodge_boost',
      name: '轻身',
      description: '提升15%闪避率',
      effect: player => {
        if (player.stats) {
          player.stats.dodgeRate = (player.stats.dodgeRate || 0.05) + 0.15
        }
      }
    },
    {
      id: 'vampire_boost',
      name: '吸血',
      description: '提升10%吸血率',
      effect: player => {
        if (player.stats) {
          player.stats.vampireRate = (player.stats.vampireRate || 0) + 0.1
        }
      }
    },
    {
      id: 'combat_boost',
      name: '战意',
      description: '提升10%战斗属性',
      effect: player => {
        if (player.stats) {
          player.stats.combatBoost = (player.stats.combatBoost || 0) + 0.1
        }
      }
    }
  ],
  rare: [
    {
      id: 'defense_master',
      name: '防御大师',
      description: '防御力提升10%',
      effect: player => {
        if (player.stats) {
          player.stats.defense = (player.stats.defense || 5) * 1.1
        }
      }
    },
    {
      id: 'crit_mastery',
      name: '会心精通',
      description: '暴击率提升10%，暴击伤害提升20%',
      effect: player => {
        if (player.stats) {
          player.stats.critRate = (player.stats.critRate || 0.05) + 0.1
          player.stats.critDamageBoost = (player.stats.critDamageBoost || 0.2) + 0.2
        }
      }
    },
    {
      id: 'dodge_master',
      name: '无影',
      description: '闪避率提升10%',
      effect: player => {
        if (player.stats) {
          player.stats.dodgeRate = (player.stats.dodgeRate || 0.05) + 0.1
        }
      }
    },
    {
      id: 'combo_master',
      name: '连击精通',
      description: '连击率提升10%',
      effect: player => {
        if (player.stats) {
          player.stats.comboRate = (player.stats.comboRate || 0) + 0.1
        }
      }
    },
    {
      id: 'vampire_master',
      name: '血魔',
      description: '吸血率提升5%',
      effect: player => {
        if (player.stats) {
          player.stats.vampireRate = (player.stats.vampireRate || 0) + 0.05
        }
      }
    },
    {
      id: 'stun_master',
      name: '震慑',
      description: '眩晕率提升5%',
      effect: player => {
        if (player.stats) {
          player.stats.stunRate = (player.stats.stunRate || 0) + 0.05
        }
      }
    }
  ],
  epic: [
    {
      id: 'ultimate_power',
      name: '极限突破',
      description: '所有战斗属性提升50%',
      effect: player => {
        if (player.stats) {
          player.stats.combatBoost = (player.stats.combatBoost || 0) + 0.5
          player.stats.finalDamageBoost = (player.stats.finalDamageBoost || 0) + 0.5
        }
      }
    },
    {
      id: 'divine_protection',
      name: '天道庇护',
      description: '最终减伤提升30%',
      effect: player => {
        if (player.stats) {
          player.stats.finalDamageReduce = (player.stats.finalDamageReduce || 0) + 0.3
        }
      }
    },
    {
      id: 'combat_master',
      name: '战斗大师',
      description: '所有战斗属性和抗性提升25%',
      effect: player => {
        if (player.stats) {
          player.stats.combatBoost = (player.stats.combatBoost || 0) + 0.25
          player.stats.resistanceBoost = (player.stats.resistanceBoost || 0) + 0.25
        }
      }
    },
    {
      id: 'immortal_body',
      name: '不朽之躯',
      description: '生命上限提升100%，最终减伤提升20%',
      effect: player => {
        if (player.stats) {
          player.stats.maxHealth = (player.stats.maxHealth || 100) * 2
          player.stats.health = player.stats.maxHealth
          player.stats.finalDamageReduce = (player.stats.finalDamageReduce || 0) + 0.2
        }
      }
    },
    {
      id: 'celestial_might',
      name: '天人合一',
      description: '所有战斗属性提升40%，生命值增加50%',
      effect: player => {
        if (player.stats) {
          player.stats.combatBoost = (player.stats.combatBoost || 0) + 0.4
          player.stats.maxHealth = (player.stats.maxHealth || 100) * 1.5
          player.stats.health = Math.min(player.stats.maxHealth, player.stats.health + player.stats.maxHealth * 0.5)
        }
      }
    },
    {
      id: 'battle_sage_supreme',
      name: '战圣至尊',
      description: '暴击率提升40%，暴击伤害提升80%，最终伤害提升20%',
      effect: player => {
        if (player.stats) {
          player.stats.critRate = (player.stats.critRate || 0.05) + 0.4
          player.stats.critDamageBoost = (player.stats.critDamageBoost || 0.5) + 0.8
          player.stats.finalDamageBoost = (player.stats.finalDamageBoost || 0) + 0.2
        }
      }
    }
  ]
}

// 获取随机选项
const getRandomOptions = (floor: number, previous: DungeonOption[] = [], keepId = ''): DungeonOption[] => {
  // 基础概率设置
  let commonChance = 0.7
  let rareChance = 0.25
  let epicChance = 0.05
  // 根据层数调整概率
  if (floor % 10 === 0) {
    // 每10层提高史诗品质概率
    commonChance = 0.5
    rareChance = 0.3
    epicChance = 0.2 // 提高史诗品质概率到20%
  } else if (floor % 5 === 0) {
    // 每5层提高稀有品质概率
    commonChance = 0.5
    rareChance = 0.35 // 提高稀有品质概率到35%
    epicChance = 0.15
  }
  const keepAt = previous.findIndex(option => option.id === keepId)
  const count = keepAt === -1 ? 3 : 2
  const selected: DungeonOption[] = []
  const usedIds = new Set(previous.map(option => option.id))
  while (selected.length < count) {
    // 为每个选项独立随机决定品质
    const rand = Math.random()
    let pool: DungeonOptionQuality = 'common'
    if (rand < epicChance) {
      pool = 'epic'
    } else if (rand < epicChance + rareChance) {
      pool = 'rare'
    }
    // 从选定的池中随机选择一个选项
    const options = roguelikeOptions[pool].filter(opt => !usedIds.has(opt.id))
    if (options.length > 0) {
      const index = Math.floor(Math.random() * options.length)
      const option = options[index]
      selected.push({ ...option, type: pool })
      usedIds.add(option.id)
    } else {
      // 如果当前品质池中没有可用选项，尝试其他品质池
      const allOptions = [...roguelikeOptions.common, ...roguelikeOptions.rare, ...roguelikeOptions.epic].filter(
        opt => !usedIds.has(opt.id)
      )
      if (allOptions.length > 0) {
        const index = Math.floor(Math.random() * allOptions.length)
        const option = allOptions[index]
        selected.push({ ...option, type: pool })
        usedIds.add(option.id)
      }
    }
  }
  if (keepAt !== -1) selected.splice(keepAt, 0, previous[keepAt]!)
  return selected
}

export { difficultyModifiers, roguelikeOptions, getRandomOptions }
