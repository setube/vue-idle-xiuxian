import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getRandomReward, handleReward, triggerRandomEvent } from '../plugins/events'
import { locations, rollExploration } from '../plugins/locations'
import { herbs } from '../plugins/herbs'
import { usePlayerStore } from './player'
import type { ExplorationLocation, LogEntry, MessageType } from '../types/game'

import { starterSwordId } from '../plugins/navigation'
export { starterSwordId }

export const useExplorationStore = defineStore('exploration', () => {
  const player = usePlayerStore()
  const logs = ref<LogEntry[]>([])
  const latestResult = ref<{ place: string; cost: number; lines: string[] }>()
  const target = computed(() => locations.find(place => place.id === player.autoExploreLocation && place.minLevel <= player.level))
  let nextVisit = 0

  function isFirstVisit(place: ExplorationLocation) {
    return place.id === 'newbie_village' && player.journeyStage === 'village'
  }

  function cost(place: ExplorationLocation) {
    return isFirstVisit(place) ? 0 : place.spiritCost
  }

  function visit(place: ExplorationLocation, gather?: 'spirit_grass' | 'cloud_flower') {
    if (player.level < place.minLevel || player.spirit < cost(place)) return false
    const visits = player.locationVisits[place.id] ?? 0
    const herb = gather && herbs.find(entry => entry.id === gather)
    if (gather && (!herb || place.id !== 'newbie_village' || visits < 3 || target.value)) return false
    const spent = cost(place)
    const lines: string[] = []
    function log(type: MessageType, content: string) {
      lines.push(content)
      logs.value.push({ type, content, time: new Date().toLocaleTimeString() })
      if (logs.value.length > 80) logs.value.shift()
    }
    player.spirit -= spent
    player.explorationCount++
    player.locationVisits[place.id] = visits + 1
    if (herb) {
      const amount = visits >= 6 ? 2 : 1
      player.gainHerb({ ...herb, quality: 'common', value: herb.baseValue }, amount)
      log('success', '在村后药圃采得' + herb.name + ' ×' + amount)
    } else if (isFirstVisit(place)) {
      player.items.push({ id: starterSwordId, type: 'weapon', name: '青竹剑', quality: 'common', unread: true,
        requiredRealm: 1, level: 1, stats: { attack: 12 } })
      player.journeyStage = player.dungeonHighestFloor > 0 ? 'done' : 'trial'
      log('success', '铁匠赠你青竹剑，穿戴可增加 12 点攻击。')
    } else {
      const previousLevel = player.level
      const roll = rollExploration(player, place)
      if (roll.eventTriggered) {
        if (!triggerRandomEvent(player, log)) log('info', '一路平安，未遇到特殊机缘。')
      } else {
        const reward = getRandomReward(place.rewards)
        if (reward) handleReward({ ...reward, amount: Math.floor(reward.amount * roll.rewardMultiplier) }, player, log, place.id)
        if (reward && roll.rewardMultiplier > 1) log('success', '福缘加持，获得了更多奖励！')
      }
      if (player.level > previousLevel) log('success', `[突破] 当前境界：${player.realm}`)
    }
    if (place.id === 'newbie_village') {
      if (visits + 1 === 3) log('success', '发现村后药圃，可以定向采药。')
      if (visits + 1 === 6) log('success', '已熟悉采药路线，下次起每次采得 2 株。')
    }
    // The free first visit already shows the global starter-sword notification.
    if (spent > 0) latestResult.value = { place: place.name, cost: spent, lines }
    void player.saveData()
    return true
  }

  function toggle(place: ExplorationLocation) {
    player.autoExploreLocation = target.value?.id === place.id ? '' : place.id
    nextVisit = 0
    void player.saveData()
  }

  function tick(now: number) {
    const place = target.value
    if (!place) {
      if (player.autoExploreLocation) player.autoExploreLocation = ''
      player.tickAutoCultivation()
      return
    }
    if (!player.explorationFirst) player.tickAutoCultivation()
    if (now >= nextVisit && visit(place)) nextVisit = now + 3000
    if (player.explorationFirst) {
      const needed = cost(place)
      // If the spirit cap is too low, allow cultivation to raise it.
      player.tickAutoCultivation(needed <= player.effectiveSpiritCap ? needed : 0)
    }
  }
  return { logs, latestResult, target, isFirstVisit, cost, visit, toggle, tick }
})
