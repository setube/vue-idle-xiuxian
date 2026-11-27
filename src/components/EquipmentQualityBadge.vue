<template>
  <span class="quality-badge">
    <span class="quality-dot" :style="{ backgroundColor: info?.color ?? '#888' }" aria-hidden="true" />
    <strong>{{ info?.name ?? '未知品质' }}</strong>
    <span class="item-score" title="按这件装备自身的战斗属性估算">评分 {{ score.toLocaleString('zh-CN') }}</span>
  </span>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { equipmentQualities, isEquipmentQuality } from '../plugins/equipment-quality'

  import type { Equipment } from '../types/game'
  import { battlePoints } from '../plugins/companion-ranking'

  const props = defineProps<{ item: Equipment }>()
  const score = computed(() => battlePoints(props.item.stats))
  const info = computed(() => isEquipmentQuality(props.item.quality) ? equipmentQualities[props.item.quality] : undefined)
</script>

<style scoped>
  .quality-badge { display: inline-flex; align-items: center; flex-wrap: wrap; gap: .35em; font-size: .9em; }
  .item-score { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .quality-dot { width: .65em; height: .65em; border-radius: 50%; flex: none; }
</style>
