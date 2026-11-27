<template>
  <details class="auto-loot" :open="expanded">
    <summary>{{ kind === 'gear' ? '自动卖出' : '自动放生' }} · {{ summary }}</summary>
    <p>{{ kind === 'gear' ? '新抽到的所选品质装备会换成强化石。' : '仅放生新抽到的多余灵宠，保留出战宠、已培养灵宠和升星材料。' }}</p>
    <div class="quality-options">
      <label><input type="checkbox" v-model="selected" value="all" /> 全部品质</label>
      <label v-for="(info, key) in qualities" :key="key">
        <input type="checkbox" v-model="selected" :value="key" :disabled="selected.includes('all')" /> {{ info.name }}
      </label>
    </div>
  </details>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { equipmentQualities } from '../plugins/equipment-quality'
  import { usePlayerStore } from '../stores/player'

  const props = defineProps<{ kind: 'gear' | 'pet'; expanded?: boolean }>()
  const player = usePlayerStore()
  const qualities = computed<Record<string, { name: string }>>(() =>
    props.kind === 'gear' ? equipmentQualities : player.petConfig.rarityMap)
  const selected = computed<string[]>({
    get: () => props.kind === 'gear' ? player.autoSellQualities : player.autoReleaseRarities,
    set(values) {
      const choices = values.includes('all') ? ['all'] : values
      if (props.kind === 'gear') player.autoSellQualities = choices
      else player.autoReleaseRarities = choices
      void player.saveData()
    }
  })
  const summary = computed(() => selected.value.includes('all') ? '全部品质' :
    selected.value.map(key => qualities.value[key]?.name).filter(Boolean).join('、') || '关闭')
</script>

<style scoped>
  .auto-loot summary,.quality-options label { cursor: pointer; }
  .auto-loot p { margin: 6px 0; }
  .quality-options { display: flex; flex-wrap: wrap; gap: 4px 16px; }
</style>
