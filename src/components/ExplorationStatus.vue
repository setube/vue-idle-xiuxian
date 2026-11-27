<template>
  <n-alert v-if="explore.target" type="info" :title="'自动探索 · ' + explore.target.name">
    <n-space align="center">
      <span>{{ status }}</span>
      <template v-if="player.autoCultivationEnabled">
        <label>灵力优先用于
          <select v-model="player.explorationFirst"><option :value="true">探索</option><option :value="false">修炼</option></select>
        </label>
      </template>
      <n-button size="small" @click="explore.toggle(explore.target)">停止自动探索</n-button>
    </n-space>
  </n-alert>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { usePlayerStore } from '../stores/player'
  import { useExplorationStore } from '../stores/exploration'
  const player = usePlayerStore()
  const explore = useExplorationStore()
  const status = computed(() => {
    if (!explore.target) return ''
    const cost = explore.cost(explore.target)
    if (player.spirit >= cost) return '等候下次探索'
    if (player.effectiveSpiritCap < cost) return '灵力容量不足，请先修炼突破或补充灵力。'
    return '等待回灵，还差 ' + Math.ceil(cost - player.spirit) + ' 灵力'
  })
</script>
