<template>
  <span class="equip-comparison" aria-label="装备属性">
    <span v-for="stat in keys" :key="stat" class="equip-stat">
      {{ getStatName(stat) }} <b>{{ formatStatValue(stat, candidate.stats[stat] ?? 0) }}</b>
      <span v-if="changes[stat]" :class="changes[stat] > 0 ? 'increase' : 'decrease'" title="与已穿戴装备的差值">({{ changes[stat] > 0 ? '+' : '−' }}{{ formatStatValue(stat, Math.abs(changes[stat])) }})</span>
    </span>
    <small v-if="current === null">可填补空位</small>
    <small v-else-if="current && !Object.keys(changes).length">与已穿装备属性相同</small>
  </span>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { Equipment } from '../types/game'
  import { equipmentDifferences } from '../plugins/equipment-stats'
  import { formatStatValue, getStatName } from '../plugins/stats'

  const props = defineProps<{ candidate: Equipment; current?: Equipment | null }>()
  const changes = computed(() => props.current ? equipmentDifferences(props.candidate.stats, props.current.stats) : {})
  const keys = computed(() => [...new Set([...Object.keys(props.candidate.stats), ...Object.keys(changes.value)])])
</script>

<style scoped>
  .equip-comparison { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 14px; font-size: 13px; line-height: 1.6; text-align: start; font-variant-numeric: tabular-nums; }
  .equip-stat { display: inline-block; }
  .equip-stat b { font-weight: 600; }
  .increase { color: #18794e; }
  .decrease { color: #ad4032; }
  :global(html.dark) .increase { color: #76dcad; }
  :global(html.dark) .decrease { color: #ffa498; }
</style>
