<script setup>
import { usePlayerStore } from '../stores/player'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { NIcon } from 'naive-ui'
import { BookOutline } from '@vicons/ionicons5'
import LogPanel from '../components/LogPanel.vue'
import { formatNumberToChineseUnit } from '../plugins/utils'

const playerStore = usePlayerStore()
const logRef = ref(null)

// 修炼相关数值
const baseGainRate = 1  // 基础灵力获取率
const baseCultivationCost = 10  // 基础修炼消耗的灵力
const baseCultivationGain = 1  // 基础修炼获得的修为
const autoGainInterval = 1000  // 自动获取灵力的间隔（毫秒）
const extraCultivationChance = 0.3  // 获得额外修为的基础概率

// 计算当前境界的修炼消耗
const getCurrentCultivationCost = () => {
  return Math.floor(baseCultivationCost * Math.pow(1.5, playerStore.level - 1))
}

// 计算当前境界的修炼获得
const getCurrentCultivationGain = () => {
  return Math.floor(baseCultivationGain * Math.pow(1.2, playerStore.level - 1))
}

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
const cultivationTimer = ref(null)

// 显示消息并处理重复
const showMessage = (type, content) => {
  return logRef.value?.addLog(type, content);
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

// 一键修炼（直到突破）
const cultivateUntilBreakthrough = () => {
  try {
    // 检查是否已经达到突破条件
    if (!canBreakthrough()) {
      const totalCost = calculateBreakthroughCost()
      if (totalCost <= 0) {
        showMessage('error', '计算修炼消耗出错，请稍后再试')
        return
      }
      if (playerStore.spirit < totalCost) {
        showMessage('error', `灵力不足！突破需要${totalCost}灵力，当前灵力：${(playerStore.spirit || 0).toFixed(1)}`)
        return
      }

      const gain = cultivationGain?.value || 1
      if (gain <= 0) {
        showMessage('error', '修炼效率异常，请稍后再试')
        return
      }
      const remainingCultivation = Math.max(0, playerStore.maxCultivation - playerStore.cultivation)
      const times = Math.ceil(remainingCultivation / gain)
      const currentCost = getCurrentCultivationCost()

      // 先检查灵力是否足够
      if (playerStore.spirit < times * currentCost) {
        showMessage('error', '灵力不足以完成修炼！')
        return
      }

      // 扣除灵力并修炼
      playerStore.spirit -= times * currentCost
      for (let i = 0; i < times; i++) {
        playerStore.cultivate(calculateCultivationGain())
      }
    }

    // 尝试突破
    if (canBreakthrough() && playerStore.tryBreakthrough()) {
      showMessage('success', `突破成功！恭喜进入${playerStore.realm}！`)
    } else {
      showMessage('info', '已达到突破条件，但突破失败，请继续努力！')
    }
  } catch (error) {
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
      if (cultivationTimer.value) return

      cultivationTimer.value = setInterval(() => {
        const currentCost = getCurrentCultivationCost()
        if (playerStore.spirit >= currentCost) {
          playerStore.spirit -= currentCost
          playerStore.cultivate(cultivationGain.value)
        }
      }, autoGainInterval)
    } else {
      if (cultivationTimer.value) {
        clearInterval(cultivationTimer.value)
        cultivationTimer.value = null
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
    if (cultivationTimer.value) {
      clearInterval(cultivationTimer.value)
      cultivationTimer.value = null
    }
    isAutoCultivating.value = false
  } catch (error) {
    console.error('清理定时器出错：', error)
  }
})
</script>

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
          打坐修炼 (消耗 {{ formatNumberToChineseUnit(cultivationCost) }} 灵力)
        </n-button>

        <n-button :type="isAutoCultivating ? 'warning' : 'success'" size="large" block @click="toggleAutoCultivation">
          {{ isAutoCultivating ? '停止自动修炼' : '开始自动修炼' }}
        </n-button>

        <n-button type="info" size="large" block @click="cultivateUntilBreakthrough"
          :disabled="playerStore.spirit < calculateBreakthroughCost()">
          一键突破
        </n-button>
      </n-space>

      <n-divider />

      <n-collapse>
        <n-collapse-item title="修炼详情" name="details">
          <n-descriptions bordered>
            <n-descriptions-item label="灵力获取速率">
              {{ formatNumberToChineseUnit(baseGainRate * playerStore.spiritRate) }} / 秒
            </n-descriptions-item>
            <n-descriptions-item label="修炼效率">
              {{ formatNumberToChineseUnit(cultivationGain) }} 修为 / 次
            </n-descriptions-item>
            <n-descriptions-item label="突破所需修为">
              {{ formatNumberToChineseUnit(playerStore.maxCultivation) }}
            </n-descriptions-item>
          </n-descriptions>
        </n-collapse-item>
      </n-collapse>

      <log-panel ref="logRef" title="修炼日志" />
    </n-space>
  </n-card>
</template>

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