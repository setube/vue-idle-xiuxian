<template>
  <section class="idle-panel" aria-label="秘境挂机">
    <header>
      <strong>秘境挂机</strong>
      <span v-if="idle.floor" class="status">
        {{ activity.challenging ? '挑战中 · 挂机暂停' : '挂机中' }} · {{ dungeonNames[idle.difficulty] }} 第 {{ idle.floor }} 层
      </span>
    </header>
    <div v-if="highest" class="controls">
      <label>挂机层数 <n-input-number v-model:value="floor" aria-label="挂机层数"
        :min="1" :max="highest" :precision="0" size="small" style="width: 112px" /></label>
      <span v-if="rates">每小时 {{ rates.stones.toLocaleString() }} 灵石<template v-if="rates.refinement"> · {{ rates.refinement }} 洗练石</template></span>
      <n-button v-if="!sameTarget" size="small" type="primary" :disabled="!rates" @click="start">
        {{ idle.floor ? '切换挂机层' : '开始挂机' }}
      </n-button>
      <n-button v-if="idle.floor" size="small" @click="player.setIdleFloor(idle.difficulty, 0)">停止挂机</n-button>
    </div>
    <div v-else class="controls">
      <span>通关本难度第 1 层可开启挂机。</span>
      <n-button v-if="idle.floor" size="small" @click="player.setIdleFloor(idle.difficulty, 0)">停止挂机</n-button>
    </div>
    <div v-if="idle.away.ms" class="receipt">
      上次离线 {{ duration(idle.away.ms) }} · 已入账 {{ idle.away.stones.toLocaleString() }} 灵石<span v-if="idle.away.refinement">、{{ idle.away.refinement }} 洗练石</span>
    </div>
    <small v-if="idle.ms">累计挂机 {{ duration(idle.ms) }} · {{ idle.stones.toLocaleString() }} 灵石 · {{ idle.refinement }} 洗练石</small>
    <small v-else-if="highest">离线最多 8 小时，收益自动入账。</small>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { highestFloorKey } from '../plugins/battle-report'
  import { dungeonNames, idleRates } from '../plugins/dungeon-idle'
  import { useDungeonActivity, usePlayerStore } from '../stores/player'

  const player = usePlayerStore()
  const activity = useDungeonActivity()
  const idle = computed(() => player.dungeonIdle)
  const highest = computed(() => player[highestFloorKey(player.dungeonDifficulty)])
  const floor = ref<number | null>(null)
  watch([() => player.dungeonDifficulty, highest], () => {
    floor.value = idle.value.floor && idle.value.difficulty === player.dungeonDifficulty
      ? idle.value.floor : highest.value || null
  }, { immediate: true })
  const sameTarget = computed(() => !!idle.value.floor && idle.value.difficulty === player.dungeonDifficulty && idle.value.floor === floor.value)
  const rates = computed(() => floor.value && floor.value >= 1 && floor.value <= highest.value ? idleRates(player.dungeonDifficulty, floor.value) : null)
  function start() {
    if (floor.value) player.setIdleFloor(player.dungeonDifficulty, floor.value)
  }
  function duration(ms: number) {
    const minutes = Math.floor(ms / 60_000)
    if (!minutes) return Math.floor(ms / 1000) + ' 秒'
    if (minutes < 60) return minutes + ' 分钟'
    return Math.floor(minutes / 60) + ' 小时' + (minutes % 60 ? ' ' + minutes % 60 + ' 分钟' : '')
  }
</script>

<style scoped>
  .idle-panel { padding: 12px 16px; margin-bottom: 16px; border: 1px solid var(--line); border-radius: 6px; }
  .idle-panel header, .controls, .controls label { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .controls { margin: 8px 0; }
  .status { color: var(--ink); font-weight: 600; }
  small { color: var(--muted); }
  .receipt { margin: 6px 0; }
</style>
