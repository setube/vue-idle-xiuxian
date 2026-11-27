<template>
  <section class="character-training" aria-label="修炼">
    <n-space vertical>
      <n-alert type="info" show-icon>
        <span class="meditation-art" aria-hidden="true" :class="{ breathing: input.manualPress || (playerStore.autoCultivationEnabled && !atMaxRealm && playerStore.spirit >= cultivationCost) }"></span>
        <template #icon>
          <n-icon>
            <book-outline />
          </n-icon>
        </template>
        <template v-if="atMaxRealm">已至大罗九重，可前往秘境挑战更高层数。</template>
        <template v-else-if="canAffordBreakthrough">灵力充足，可以一键突破至{{ nextRealmName }}。</template>
        <template v-else>前往{{ nextRealmName }}还差 {{ Math.ceil(breakthroughCost - playerStore.spirit).toLocaleString() }} 灵力。{{ waitEstimate }}</template>
        <div v-if="!atMaxRealm" class="realm-preview">突破额外加成 · 攻击 +{{ nextGrowth.attack }}　防御 +{{ nextGrowth.defense }}　气血 +{{ nextGrowth.health }}</div>
      </n-alert>
      <div class="training-actions">
        <MeditationButton :cost="cultivationCost" :disabled="manualDisabled" @meditate="cultivate" />
        <n-button :type="playerStore.autoCultivationEnabled ? 'warning' : 'success'" size="large" block @click="playerStore.autoCultivationEnabled = !playerStore.autoCultivationEnabled">
          {{ playerStore.autoCultivationEnabled ? '停止自动修炼' : '开始自动修炼' }}
        </n-button>
        <n-button type="info" size="large" block @click="cultivateUntilBreakthrough"
          :disabled="atMaxRealm || !canAffordBreakthrough || isCalculating || input.manualPress">一键突破</n-button>
      </div>
        <span v-if="nextSitHint">{{ nextSitHint }}</span>
        <ExplorationStatus />
        <span v-if="playerStore.autoCultivationEnabled && atMaxRealm">已到最高境界，自动修炼已暂停。</span>
        <span v-else-if="playerStore.autoCultivationEnabled && input.manualPress">手动打坐中，松开后恢复自动修炼。</span>
        <span v-else-if="playerStore.autoCultivationEnabled">
          {{ playerStore.spirit < cultivationCost
            ? `等待灵力 · ${Math.floor(playerStore.spirit)} / ${cultivationCost}`
            : '自动修炼中' }}
        </span>
    </n-space>
  </section>
</template>

<script setup lang="ts">
  import MeditationButton from '../components/MeditationButton.vue'
  import ExplorationStatus from '../components/ExplorationStatus.vue'

  import { useCultivationInput, usePlayerStore } from '../stores/player'
  import { ref, computed, onUnmounted } from 'vue'
  import { realmGrowth, getRealmLength, getRealmName } from '../plugins/realm'
  import { NIcon, useMessage } from 'naive-ui'
  import { useGameNotices } from '../plugins/game-notices'
  import { BookOutline } from '@vicons/ionicons5'

  const playerStore = usePlayerStore()
  const input = useCultivationInput()
  const message = useMessage()
  const notify = useGameNotices()

  // 修炼相关数值
  const extraCultivationChance = 0.3 // 获得额外修为的基础概率

  const cultivationCost = computed(() => playerStore.cultivationPlan.cost)
  const cultivationGain = computed(() => playerStore.cultivationPlan.gain)
  const breakthroughCost = computed(() => playerStore.cultivationPlan.totalCost)

  const atMaxRealm = computed(() => playerStore.level >= getRealmLength())
  const nextRealmName = computed(() => getRealmName(Math.min(getRealmLength(), playerStore.level + 1)).name)
  const nextGrowth = computed(() => {
    const now = realmGrowth(playerStore.level, 1)
    const next = realmGrowth(playerStore.level + 1)
    return { attack: next.attack - now.attack, defense: next.defense - now.defense, health: next.health - now.health }
  })
  const canAffordBreakthrough = computed(() => playerStore.spirit >= breakthroughCost.value)
  const waitEstimate = computed(() => {
    if (breakthroughCost.value > playerStore.effectiveSpiritCap) return '当前灵力容量不足，请先打坐积累修为。'
    if (playerStore.effectiveSpiritRate <= 0) return '请先提升回灵速率。'
    const seconds = Math.ceil((breakthroughCost.value - playerStore.spirit) / playerStore.effectiveSpiritRate)
    const time = seconds < 60 ? seconds + ' 秒'
      : seconds < 3600 ? Math.ceil(seconds / 60) + ' 分钟'
      : seconds < 86400 ? Math.ceil(seconds / 3600) + ' 小时' : Math.ceil(seconds / 86400) + ' 天'
    return '按当前回灵速率，专心攒灵约需 ' + time + '。'
  })

  const isCalculating = ref(false)
  const manualDisabled = computed(() => atMaxRealm.value || isCalculating.value || playerStore.spirit < cultivationCost.value)

  const nextSitHint = computed(() => {
    const missing = Math.ceil(cultivationCost.value - playerStore.spirit)
    if (missing <= 0 || atMaxRealm.value) return ''
    const seconds = Math.ceil(missing / playerStore.effectiveSpiritRate)
    return '下次打坐还差 ' + missing + ' 灵力' +
      (Number.isFinite(seconds) && playerStore.effectiveSpiritCap >= cultivationCost.value ? '，按当前回灵速度约需 ' + seconds + ' 秒。' : '。')
  })

  // 检查是否可以突破
  const canBreakthrough = () => {
    return playerStore.cultivation >= playerStore.maxCultivation
  }

  // 修炼Worker
  let requestedLevel = 0
  const cultivationWorker = new Worker(new URL('../workers/cultivation.ts', import.meta.url), { type: 'module' })

  // 处理Worker消息
  cultivationWorker.onmessage = ({ data }) => {
    isCalculating.value = false
    if (data.type === 'error') {
      message.error(data.message)
      return
    }
    if (data.type === 'success') {
      const { spiritCost, cultivationGain } = data.result
      // The automatic tick may already have completed this realm while the worker was running.
      if (playerStore.level !== requestedLevel || playerStore.spirit < spiritCost || breakthroughCost.value !== spiritCost) {
        message.info('修炼进度已更新，本次一键突破未扣除灵力。')
        return
      }
      // 扣除灵力
      playerStore.spirit -= spiritCost
      // 增加修为
      playerStore.cultivate(cultivationGain)
    }
  }

  // 一键修炼（直到突破）
  const cultivateUntilBreakthrough = () => {
    if (isCalculating.value) return
    try {
      // 检查是否已经达到突破条件
      if (!canBreakthrough()) {
        isCalculating.value = true
        requestedLevel = playerStore.level
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
        if (!playerStore.tryBreakthrough()) {
          message.info('已达到突破条件，但突破失败，请继续努力！')
        }
      }
    } catch (error) {
      isCalculating.value = false
      console.error('一键修炼出错：', error)
      message.error('修炼失败！')
    }
  }

  // 手动修炼
  const cultivate = () => {
    if (manualDisabled.value) return
    const currentCost = cultivationCost.value
    const doubled = Math.random() < extraCultivationChance * playerStore.luck
    const gain = cultivationGain.value * (doubled ? 2 : 1)
    playerStore.spirit -= currentCost
    playerStore.cultivate(gain)
    notify(doubled ? '双倍修为' : '打坐', '修为 +' + Number(gain.toFixed(2)))
    notify('打坐', '灵力 −' + currentCost)
  }

  onUnmounted(() => cultivationWorker.terminate())
</script>

<style scoped>
  .character-training {padding-top:12px;border-top:1px solid #82988b55;}
  .training-actions {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr));gap:8px;}
  .meditation-art { float:right; position:relative; width:clamp(78px,20vw,150px); aspect-ratio:240/112; margin-left:8px; background:url('/meditation.svg') center / contain no-repeat; }
  .meditation-art.breathing::after { content:''; position:absolute; inset:63% 27% 12%; border:1px solid #508f7d; border-radius:50%; animation:breath 2.2s ease-out infinite; }
  @keyframes breath { from { transform:scale(.65); opacity:1; } to { transform:scale(1.3); opacity:0; } }
  @media(prefers-reduced-motion:reduce) { .meditation-art.breathing::after {animation:none;} }
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
