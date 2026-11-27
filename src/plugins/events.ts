import type { usePlayerStore } from '../stores/player'
import type { Reward, RewardOption, ShowMessage } from '../types/game'

type PlayerStore = ReturnType<typeof usePlayerStore>
interface GameEvent { id: string; name: string; description: string; chance: number; effect: (playerStore: PlayerStore, showMessage: ShowMessage) => void }

import { locations } from './locations'
import { getRandomHerb, herbQualities } from './herbs'
import { pillRecipes, STARTER_RECIPE_ID } from './pills'

// 随机事件配置
export const events: GameEvent[] = [
  {
    id: 'ancient_tablet',
    name: '古老石碑',
    description: '发现一块刻有上古功法的石碑。',
    chance: 0.08,
    effect: (playerStore, showMessage) => {
      const bonus = Math.floor(30 * (playerStore.level / 5 + 1))
      playerStore.gainCultivation(bonus)
      showMessage('success', `[古老石碑]领悟石碑上的功法，获得${bonus}点修为`)
    }
  },
  {
    id: 'spirit_spring',
    name: '灵泉',
    description: '偶遇一处天然灵泉。',
    chance: 0.12,
    effect: (playerStore, showMessage) => {
      const bonus = Math.floor(60 * (playerStore.level / 3 + 1))
      playerStore.spirit += bonus
      showMessage('success', `[灵泉]饮用灵泉，灵力增加${bonus}点`)
    }
  },
  {
    id: 'ancient_master',
    name: '古修遗府',
    description: '意外发现一位上古大能的洞府。',
    chance: 0.03,
    effect: (playerStore, showMessage) => {
      const cultivationBonus = Math.floor(120 * (playerStore.level / 2 + 1))
      const spiritBonus = Math.floor(180 * (playerStore.level / 2 + 1))
      playerStore.gainCultivation(cultivationBonus)
      playerStore.spirit += spiritBonus
      showMessage('success', `[古修遗府]修为 +${cultivationBonus}`)
      showMessage('success', `[古修遗府]灵力 +${spiritBonus}`)
    }
  },
  {
    id: 'monster_attack',
    name: '妖兽袭击',
    description: '遭遇一只实力强大的妖兽。',
    chance: 0.15,
    effect: (playerStore, showMessage) => {
      const damage = Math.floor(80 * (playerStore.level / 4 + 1))
      playerStore.spirit = Math.max(0, playerStore.spirit - damage)
      showMessage('error', `[妖兽袭击]与妖兽激战，损失${damage}点灵力`)
    }
  },
  {
    id: 'cultivation_deviation',
    name: '走火入魔',
    description: '修炼出现偏差，走火入魔。',
    chance: 0.12,
    effect: (playerStore, showMessage) => {
      const damage = Math.floor(50 * (playerStore.level / 3 + 1))
      playerStore.cultivation = Math.max(0, playerStore.cultivation - damage)
      showMessage('error', `[走火入魔]走火入魔，损失${damage}点修为`)
    }
  },
  {
    id: 'treasure_trove',
    name: '秘境宝藏',
    description: '发现一处上古修士遗留的宝藏。',
    chance: 0.05,
    effect: (playerStore, showMessage) => {
      const stoneBonus = Math.floor(30 * (playerStore.level / 2 + 1))
      playerStore.spiritStones += stoneBonus
      showMessage('success', `[秘境宝藏]发现宝藏，获得${stoneBonus}颗灵石`)
    }
  },
  {
    id: 'enlightenment',
    name: '顿悟',
    description: '修炼中突然顿悟。',
    chance: 0.08,
    effect: (playerStore, showMessage) => {
      const bonus = Math.floor(50 * (playerStore.level / 4 + 1))
      playerStore.gainCultivation(bonus)
      playerStore.spiritRate *= 1.05
      showMessage('success', `[顿悟]修为 +${bonus}`)
      showMessage('success', '[顿悟]灵力获取速率提升5%')
    }
  },
  {
    id: 'qi_deviation',
    name: '心魔侵扰',
    description: '遭受心魔侵扰，修为受损。',
    chance: 0.15,
    effect: (playerStore, showMessage) => {
      const damage = Math.floor(60 * (playerStore.level / 3 + 1))
      const spiritLost = Math.min(playerStore.spirit, damage)
      const cultivationLost = Math.min(playerStore.cultivation, damage)
      playerStore.spirit -= spiritLost
      playerStore.cultivation -= cultivationLost
      showMessage('error', `[心魔侵扰]灵力 −${spiritLost}`)
      showMessage('error', `[心魔侵扰]修为 −${cultivationLost}`)
    }
  }
]

// 奖励处理函数
export const handleReward = (reward: Reward, playerStore: PlayerStore, showMessage: ShowMessage, locationId?: string) => {
  switch (reward.type) {
    case 'spirit_stone':
      playerStore.spiritStones += reward.amount
      showMessage('success', `[灵石获取]获得${reward.amount}颗灵石`)
      break
    case 'herb':
      // 获取指定数量的随机灵草
      for (let i = 0; i < reward.amount; i++) {
        const herb = getRandomHerb(locations.find(place => place.id === locationId)?.herbIds)
        if (herb) {
          playerStore.gainHerb(herb)
          showMessage('success', `[灵草获取]获得${herbQualities[herb.quality as keyof typeof herbQualities].name}品质的${herb.name}`)
        }
      }
      break
    case 'cultivation':
      playerStore.gainCultivation(reward.amount)
      showMessage('success', `[修为获取]获得${reward.amount}点修为`)
      break
    case 'pill_fragment':
      if (playerStore.pillRecipes.length >= pillRecipes.length && pillRecipes.every(r => playerStore.pillRecipes.includes(r.id))) {
        handleReward({ type: 'herb', amount: reward.amount }, playerStore, showMessage, locationId)
        break
      }
      // 随机获得丹方残页
      for (let i = 0; i < reward.amount; i++) {
        const missing = pillRecipes.filter(recipe => !playerStore.pillRecipes.includes(recipe.id))
        if (!missing.length) break
        const targetId = playerStore.researchRecipe ||
          (locationId === 'newbie_village' && !playerStore.pillRecipes.length ? STARTER_RECIPE_ID : '')
        const randomRecipe = missing.find(recipe => recipe.id === targetId) ?? missing[Math.floor(Math.random() * missing.length)]
        if (randomRecipe) {
          const learned = playerStore.pillRecipes.includes(randomRecipe.id)
          playerStore.gainPillFragment(randomRecipe.id)
          if (!learned && playerStore.pillRecipes.includes(randomRecipe.id)) {
            showMessage('success', '已掌握' + randomRecipe.name + '丹方，可前往炼丹。')
          }
          showMessage('success', `[丹方获取]获得${randomRecipe.name}的丹方残页`)
        }
      }
      break
  }
}

// 随机获取奖励
export const getRandomReward = (rewards: RewardOption[]): Reward | null => {
  const rand = Math.random()
  let cumulative = 0
  for (const reward of rewards) {
    cumulative += reward.chance
    if (rand <= cumulative) {
      const amount = Math.floor(Math.random() * (reward.amount[1] - reward.amount[0] + 1)) + reward.amount[0]

      return { type: reward.type, amount }
    }
  }
  return null
}

// 触发随机事件
export const triggerRandomEvent = (playerStore: PlayerStore, message: ShowMessage) => {
  for (const event of events) {
    if (Math.random() <= event.chance) {
      message('info', `[${event.name}]${event.description}`)
      event.effect(playerStore, message)
      playerStore.eventTriggered++ // 增加事件触发次数统计
      playerStore.saveData()
      return true
    }
  }
  return false
}
