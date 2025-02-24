<script setup>
import { usePlayerStore } from '../stores/player'
import { ref } from 'vue'
import { CompassOutline } from '@vicons/ionicons5'
import LogPanel from '../components/LogPanel.vue'

const logRef = ref(null)
const playerStore = usePlayerStore()

// 探索相关数值
const explorationInterval = 3000  // 探索间隔（毫秒）
const exploringLocations = ref({})  // 记录每个地点的探索状态
const explorationTimers = ref({})  // 记录每个地点的定时器
const isAutoExploring = ref(false)  // 是否有地点正在自动探索
const autoExploringLocationId = ref(null)  // 正在自动探索的地点ID

import { getRealmName } from '../plugins/realm'
import { locations } from '../plugins/locations'
import { triggerRandomEvent, getRandomReward, handleReward } from '../plugins/events'

// 获取可用地点列表
const availableLocations = computed(() => {
  return locations.filter(loc => playerStore.level >= loc.minLevel)
})

// 显示消息并处理重复
const showMessage = (type, content) => {
  return logRef.value?.addLog(type, content);
}

// 探索指定地点
const exploreLocation = (location) => {
  if (playerStore.spirit < location.spiritCost) {
    showMessage('error', '灵力不足！')
    return
  }

  playerStore.spirit -= location.spiritCost
  playerStore.explorationCount++

  // 根据幸运值调整随机事件触发概率
  const eventChance = 0.3 * playerStore.luck  // 基础触发概率为30%，受幸运值影响

  // 随机事件判定
  if (Math.random() < eventChance) {
    if (triggerRandomEvent(playerStore, showMessage)) {
      showMessage('info', '你的福缘不错，触发了一个特殊事件！')
    }
  } else {
    // 未触发随机事件时获得基础奖励
    const reward = getRandomReward(location.rewards)
    // 根据幸运值增加奖励数量
    if (Math.random() < 0.5 * playerStore.luck) {
      reward.amount = Math.floor(reward.amount * 1.5)
      showMessage('success', '福缘加持，获得了更多奖励！')
    }
    handleReward(reward, playerStore, showMessage)
  }

  playerStore.saveData()
}

// 开始自动探索
const startAutoExploration = (location) => {
  if (exploringLocations.value[location.id] || isAutoExploring.value) return

  isAutoExploring.value = true
  autoExploringLocationId.value = location.id
  exploringLocations.value[location.id] = true
  explorationTimers.value[location.id] = setInterval(() => {
    if (playerStore.spirit >= location.spiritCost) {
      exploreLocation(location)
    } else {
      stopAutoExploration(location)
      showMessage('warning', '灵力不足，自动探索已停止！')
    }
  }, explorationInterval)
}

// 停止自动探索
const stopAutoExploration = (location) => {
  if (explorationTimers.value[location.id]) {
    clearInterval(explorationTimers.value[location.id])
    delete explorationTimers.value[location.id]
  }
  exploringLocations.value[location.id] = false
  isAutoExploring.value = false
  autoExploringLocationId.value = null
}

// 组件卸载时清理所有定时器
onUnmounted(() => {
  Object.values(explorationTimers.value).forEach(timer => clearInterval(timer))
  explorationTimers.value = {}
  exploringLocations.value = {}
})
</script>

<template>
  <n-layout>
    <n-layout-header bordered>
      <n-page-header>
        <template #title>
          探索
        </template>
      </n-page-header>
    </n-layout-header>

    <n-layout-content>
      <n-card title="探索">
        <n-space vertical>
          <n-alert type="info" show-icon>
            <template #icon>
              <n-icon>
                <compass-outline />
              </n-icon>
            </template>
            探索各处秘境，寻找机缘造化。小心谨慎，危险与机遇并存。
          </n-alert>

          <n-grid :cols="2" :x-gap="12">
            <n-grid-item v-for="location in availableLocations" :key="location.id">
              <n-card :title="location.name" size="small">
                <n-space vertical>
                  <n-text depth="3">{{ location.description }}</n-text>

                  <n-space justify="space-between">
                    <n-text>消耗灵力：{{ location.spiritCost }}</n-text>
                    <n-text>最低境界：{{ getRealmName(location.minLevel) }}</n-text>
                  </n-space>

                  <n-space>
                    <n-button type="primary" @click="exploreLocation(location)"
                      :disabled="playerStore.spirit < location.spiritCost || isAutoExploring">
                      探索
                    </n-button>

                    <n-button :type="exploringLocations[location.id] ? 'warning' : 'success'"
                      @click="exploringLocations[location.id] ? stopAutoExploration(location) : startAutoExploration(location)"
                      :disabled="playerStore.spirit < location.spiritCost || (isAutoExploring && !exploringLocations[location.id])">
                      {{ exploringLocations[location.id] ? '停止' : '自动' }}
                    </n-button>
                  </n-space>
                </n-space>
              </n-card>
            </n-grid-item>
          </n-grid>

          <n-divider />

          <n-collapse>
            <n-collapse-item title="探索统计" name="stats">
              <n-descriptions bordered>
                <n-descriptions-item label="探索次数">
                  {{ playerStore.explorationCount }}
                </n-descriptions-item>
                <n-descriptions-item label="灵石数量">
                  {{ playerStore.spiritStones }}
                </n-descriptions-item>
                <n-descriptions-item label="灵草数量">
                  {{ playerStore.herbs.length }}
                </n-descriptions-item>
                <n-descriptions-item label="丹方残页">
                  {{ Object.values(playerStore.pillFragments || {}).reduce((a, b) => a + b, 0) }}
                </n-descriptions-item>
              </n-descriptions>
            </n-collapse-item>
          </n-collapse>
        </n-space>
      </n-card>
      <log-panel ref="logRef" title="探索日志" />
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
.n-space {
  width: 100%;
}

.n-card {
  margin-bottom: 12px;
}

.n-collapse {
  margin-top: 12px;
}
</style>