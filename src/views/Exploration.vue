<template>
  <n-layout>
    <n-layout-header bordered>
      <n-page-header>
        <template #title>探索</template>
      </n-page-header>
    </n-layout-header>
    <n-layout-content>
      <n-card :bordered="false">
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
                    <n-text>最低境界：{{ getRealmName(location.minLevel).name }}</n-text>
                  </n-space>
                  <n-space>
                    <n-button
                      type="primary"
                      @click="exploreLocation(location)"
                      :disabled="playerStore.spirit < location.spiritCost || isAutoExploring || isExploring"
                    >
                      探索
                    </n-button>
                    <n-button
                      :type="exploringLocations[location.id] ? 'warning' : 'success'"
                      @click="
                        exploringLocations[location.id] ? stopAutoExploration(location) : startAutoExploration(location)
                      "
                      :disabled="
                        playerStore.spirit < location.spiritCost ||
                        (isAutoExploring && !exploringLocations[location.id])
                      "
                    >
                      {{ exploringLocations[location.id] ? '停止' : '自动' }}
                    </n-button>
                  </n-space>
                </n-space>
              </n-card>
            </n-grid-item>
          </n-grid>
          <n-divider>探索统计</n-divider>
          <n-descriptions :column="2" bordered>
            <n-descriptions-item label="探索次数">
              <NumericValue :value="playerStore.explorationCount" />
            </n-descriptions-item>
            <n-descriptions-item label="灵石数量">
              <NumericValue :value="playerStore.spiritStones" />
            </n-descriptions-item>
            <n-descriptions-item label="灵草数量">
              {{ playerStore.herbs.reduce((sum, herb) => sum + (herb.count ?? 1), 0) }}
            </n-descriptions-item>
            <n-descriptions-item label="丹方残页">
              <NumericValue :value="Object.values(playerStore.pillFragments || {}).reduce((a, b) => a + b, 0)" />
            </n-descriptions-item>
          </n-descriptions>
        </n-space>
      </n-card>
      <n-space justify="end" style="margin-bottom: 8px">
        <n-button size="small" @click="clearLogPanel" type="error" secondary>清空日志</n-button>
      </n-space>
      <log-panel ref="logRef" title="探索日志" />
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
  import NumericValue from '../components/NumericValue.vue'
  import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
  import { usePlayerStore } from '../stores/player'
  import { CompassOutline } from '@vicons/ionicons5'
  import { getRealmName } from '../plugins/realm'
  import { locations } from '../plugins/locations'
  import { triggerRandomEvent, getRandomReward, handleReward } from '../plugins/events'
  import LogPanel from '../components/LogPanel.vue'
  import type { ExplorationLocation, ExplorationResult, WorkerError, MessageType } from '../types/game'

  const logRef = ref<InstanceType<typeof LogPanel> | null>(null)
  const playerStore = usePlayerStore()
  const explorationInterval = 3000
  const exploringLocations = ref<Record<string, boolean>>({})
  const isAutoExploring = ref(false)
  const isExploring = ref(false)
  const explorationWorker = shallowRef<Worker | null>(null)
  let explorationTimer: ReturnType<typeof setInterval> | undefined
  let pendingCost = 0
  const availableLocations = computed(() => locations.filter(loc => playerStore.level >= loc.minLevel))
  const showMessage = (type: MessageType, content: string) => logRef.value?.addLog(type, content)

  const failExploration = (message: string) => {
    playerStore.spirit += pendingCost
    pendingCost = 0
    isExploring.value = false
    showMessage('error', message)
  }

  onMounted(() => {
    const worker = new Worker(new URL('../workers/exploration.ts', import.meta.url), { type: 'module' })
    explorationWorker.value = worker
    worker.onmessage = ({ data }: MessageEvent<ExplorationResult | WorkerError>) => {
      if (data.type === 'error') {
        failExploration(data.message)
        return
      }
      pendingCost = 0
      isExploring.value = false
      playerStore.explorationCount++
      if (data.eventTriggered) {
        if (triggerRandomEvent(playerStore, showMessage)) showMessage('info', '你的福缘不错，触发了一个特殊事件！')
      } else {
        const location = availableLocations.value.find(loc => loc.id === data.locationId)
        const reward = location ? getRandomReward(location.rewards) : null
        if (reward) {
          // Keep configuration immutable; repeated lucky rewards must not compound the next reward.
          const grantedReward = { ...reward, amount: Math.floor(reward.amount * data.rewardMultiplier) }
          if (data.rewardMultiplier > 1) showMessage('success', '福缘加持，获得了更多奖励！')
          handleReward(grantedReward, playerStore, showMessage)
        }
      }
      void playerStore.saveData()
    }
    worker.onerror = () => failExploration('探索计算失败，请重试')
  })

  const exploreLocation = (location: ExplorationLocation) => {
    if (isExploring.value || !explorationWorker.value) return
    if (playerStore.spirit < location.spiritCost) {
      showMessage('error', '灵力不足！')
      return
    }
    isExploring.value = true
    pendingCost = location.spiritCost
    playerStore.spirit -= pendingCost
    explorationWorker.value.postMessage({
      type: 'explore', playerData: { luck: playerStore.luck },
      location: { id: location.id, spiritCost: location.spiritCost }
    })
  }

  const stopAutoExploration = (location: ExplorationLocation) => {
    clearInterval(explorationTimer)
    explorationTimer = undefined
    exploringLocations.value[location.id] = false
    isAutoExploring.value = false
  }
  const startAutoExploration = (location: ExplorationLocation) => {
    if (isAutoExploring.value) return
    isAutoExploring.value = true
    exploringLocations.value[location.id] = true
    explorationTimer = setInterval(() => {
      if (playerStore.spirit >= location.spiritCost) exploreLocation(location)
      else {
        stopAutoExploration(location)
        showMessage('warning', '灵力不足，自动探索已停止！')
      }
    }, explorationInterval)
  }
  onUnmounted(() => {
    explorationWorker.value?.terminate()
    clearInterval(explorationTimer)
    playerStore.spirit += pendingCost
  })
  const clearLogPanel = () => logRef.value?.clearLogs()
</script>

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
