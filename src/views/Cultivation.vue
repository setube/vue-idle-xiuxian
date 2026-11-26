<template>
  <n-card title="修炼">
    <n-space vertical>
      <n-alert type="info" show-icon>
        <template #icon>
          <n-icon>
            <book-outline />
          </n-icon>
        </template>
        通过打坐修炼来提升修为，积累足够的修为后可以尝试突破境界。
      </n-alert>
      <n-space vertical>
        <n-button type="primary" size="large" block @click="cultivate" :disabled="playerStore.spirit < cultivationCost">
          打坐修炼 (消耗 <NumericValue :value="cultivationCost" /> 灵力)
        </n-button>
        <n-button :type="isAutoCultivating ? 'warning' : 'success'" size="large" block @click="toggleAutoCultivation">
          {{ isAutoCultivating ? '停止自动修炼' : '开始自动修炼' }}
        </n-button>
        <n-button
          type="info"
          size="large"
          block
          @click="cultivateUntilBreakthrough"
          :disabled="playerStore.spirit < calculateBreakthroughCost()"
        >
          一键突破
        </n-button>
      </n-space>
      <n-divider>修炼详情</n-divider>
      <n-descriptions bordered>
        <n-descriptions-item label="灵力获取速率"><NumericValue :value="baseGainRate * playerStore.spiritRate" /> / 秒</n-descriptions-item>
        <n-descriptions-item label="修炼效率"><NumericValue :value="cultivationGain" /> 修为 / 次</n-descriptions-item>
        <n-descriptions-item label="突破所需修为">
          <NumericValue :value="playerStore.maxCultivation" />
        </n-descriptions-item>
      </n-descriptions>
      <log-panel ref="logRef" title="修炼日志" />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
  import NumericValue from '../components/NumericValue.vue'

  import { usePlayerStore } from '../stores/player'
  import { ref, computed, onUnmounted } from 'vue'
  import type { MessageType } from '../types/game'
  import { getCultivationCost, getCultivationGain } from '../utils/cultivation'
  import { NIcon } from 'naive-ui'
  import { BookOutline } from '@vicons/ionicons5'
  import LogPanel from '../components/LogPanel.vue'

  const playerStore = usePlayerStore()
  const logRef = ref<InstanceType<typeof LogPanel> | null>(null)

  // 修炼相关数值
  const baseGainRate = 1 // 基础灵力获取率
  const autoGainInterval = 1000 // 自动获取灵力的间隔（毫秒）
  const extraCultivationChance = 0.3 // 获得额外修为的基础概率

  // 计算当前境界的修炼消耗
  const getCurrentCultivationCost = () => getCultivationCost(playerStore.level)

  // 计算当前境界的修炼获得
  const getCurrentCultivationGain = () => getCultivationGain(playerStore.level, playerStore.effectiveCultivationRate)

  // 计算当前修炼消耗（作为计算属性）
  const cultivationCost = computed(() => {
    return getCurrentCultivationCost()
  })

  // 计算当前修炼获得（作为计算属性）
  const cultivationGain = computed(() => {
    return getCurrentCultivationGain()
  })

  // 计算突破所需的总灵力
  const calculateBreakthroughCost = () => {
    const remainingCultivation = Math.max(0, playerStore.maxCultivation - playerStore.cultivation)
    const gain = cultivationGain?.value || 1
    if (gain <= 0) return 0
    const cultivationTimes = Math.ceil(remainingCultivation / gain)
    return Math.max(0, cultivationTimes * getCurrentCultivationCost())
  }

  // 自动修炼状态
  const isAutoCultivating = ref(false)
  let cultivationTimer: ReturnType<typeof setInterval> | undefined
  const isCalculating = ref(false)

  // 显示消息并处理重复
  const showMessage = (type: MessageType, content: string) => {
    return logRef.value?.addLog(type, content)
  }

  // 计算实际获得的修为
  const calculateCultivationGain = () => {
    let gain = cultivationGain.value
    // 根据幸运值计算是否获得额外修为
    if (Math.random() < extraCultivationChance * playerStore.luck) {
      gain *= 2
      showMessage('success', '福缘不错，获得双倍修为！')
    }
    return gain
  }

  // 检查是否可以突破
  const canBreakthrough = () => {
    return playerStore.cultivation >= playerStore.maxCultivation
  }

  // 修炼Worker
  const cultivationWorker = new Worker(new URL('../workers/cultivation.ts', import.meta.url), { type: 'module' })

  // 处理Worker消息
  cultivationWorker.onmessage = ({ data }) => {
    isCalculating.value = false
    if (data.type === 'error') {
      showMessage('error', data.message)
      return
    }
    if (data.type === 'success') {
      const { spiritCost, cultivationGain, doubleGainTimes } = data.result
      // 扣除灵力
      playerStore.spirit -= spiritCost
      // 增加修为
      playerStore.cultivate(cultivationGain)
      if (doubleGainTimes > 0) {
        showMessage('success', `福缘不错，获得${doubleGainTimes}次双倍修为！`)
      }
      // 尝试突破
      if (canBreakthrough() && playerStore.tryBreakthrough()) {
        showMessage('success', `突破成功！恭喜进入${playerStore.realm}！`)
      } else if (canBreakthrough()) {
        showMessage('info', '已达到突破条件，但突破失败，请继续努力！')
      } else {
        showMessage('success', '修炼成功！')
      }
    }
  }

  // 一键修炼（直到突破）
  const cultivateUntilBreakthrough = () => {
    if (isCalculating.value) return
    try {
      // 检查是否已经达到突破条件
      if (!canBreakthrough()) {
        isCalculating.value = true
        // 发送数据到Worker进行计算
        cultivationWorker.postMessage({
          type: 'cultivateUntilBreakthrough',
          playerData: {
            level: playerStore.level,
            spirit: playerStore.spirit,
            cultivation: playerStore.cultivation,
            maxCultivation: playerStore.maxCultivation,
            luck: playerStore.luck,
            cultivationRate: playerStore.effectiveCultivationRate
          }
        })
      } else {
        // 直接尝试突破
        if (playerStore.tryBreakthrough()) {
          showMessage('success', `突破成功！恭喜进入${playerStore.realm}！`)
        } else {
          showMessage('info', '已达到突破条件，但突破失败，请继续努力！')
        }
      }
    } catch (error) {
      isCalculating.value = false
      console.error('一键修炼出错：', error)
      showMessage('error', '修炼失败！')
    }
  }

  // 手动修炼
  const cultivate = () => {
    try {
      const currentCost = getCurrentCultivationCost()
      if (playerStore.spirit >= currentCost) {
        const oldRealm = playerStore.realm
        playerStore.spirit -= currentCost
        playerStore.cultivate(calculateCultivationGain())
        // 检查是否发生突破
        if (playerStore.realm !== oldRealm) {
          showMessage('success', `突破成功！恭喜进入${playerStore.realm}！`)
        } else {
          showMessage('success', '修炼成功！')
        }
      } else {
        showMessage('error', '灵力不足！')
      }
    } catch (error) {
      console.error('修炼出错：', error)
      showMessage('error', '修炼失败！')
    }
  }

  // 切换自动修炼
  const toggleAutoCultivation = () => {
    try {
      isAutoCultivating.value = !isAutoCultivating.value
      if (isAutoCultivating.value) {
        if (cultivationTimer) return
        cultivationTimer = setInterval(() => {
          const currentCost = getCurrentCultivationCost()
          if (playerStore.spirit >= currentCost) {
            playerStore.spirit -= currentCost
            playerStore.cultivate(cultivationGain.value)
          }
        }, autoGainInterval)
      } else {
        if (cultivationTimer) {
          clearInterval(cultivationTimer)
          cultivationTimer = undefined
        }
      }
    } catch (error) {
      console.error('切换自动修炼出错：', error)
      logRef.value?.addLog('error', '切换失败！')
      isAutoCultivating.value = false
    }
  }

  // 组件卸载时清理定时器
  onUnmounted(() => {
    try {
      cultivationWorker.terminate()
      if (cultivationTimer) {
        clearInterval(cultivationTimer)
        cultivationTimer = undefined
      }
      isAutoCultivating.value = false
    } catch (error) {
      console.error('清理定时器出错：', error)
    }
  })
</script>

<style scoped>
  .n-space {
    width: 100%;
  }

  .n-button {
    margin-bottom: 12px;
  }

  .n-collapse {
    margin-top: 12px;
  }
</style>
