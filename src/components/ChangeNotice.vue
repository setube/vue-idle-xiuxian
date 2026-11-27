<script setup lang="ts">
import GearGlyph from './GearGlyph.vue'
import type { Equipment } from '../types/game'
import { equipmentQualities, isEquipmentQuality } from '../plugins/equipment-quality'
import { formatStatValue, getStatName } from '../plugins/stats'

defineProps<{
  power: number
  changes: [string, number][]
  loot: { item: Equipment; count: number }[]
}>()
</script>

<template>
  <div class="change-notice">
    <div v-if="power" class="power" :class="{ loss: power < 0 }">
      <span>战斗力</span><b>{{ power > 0 ? '+' : '−' }}{{ Math.abs(power).toLocaleString('zh-CN') }}</b>
    </div>
    <dl v-if="changes.length" class="changes">
      <div v-for="[stat, value] in changes" :key="stat">
        <dt>{{ getStatName(stat) }}</dt>
        <dd :class="{ loss: value < 0 }">{{ value > 0 ? '+' : '−' }}{{ formatStatValue(stat, Math.abs(value)) }}</dd>
      </div>
    </dl>
    <div v-for="{ item, count } in loot" :key="item.id" class="loot">
      <GearGlyph :slot-type="item.type" :item-id="item.id" />
      <strong>{{ item.name }}</strong>
      <small><i :style="{ background: isEquipmentQuality(item.quality) ? equipmentQualities[item.quality].color : 'currentColor' }" />
        {{ isEquipmentQuality(item.quality) ? equipmentQualities[item.quality].name : item.quality }}</small>
      <b>×{{ count }}</b>
    </div>
  </div>
</template>

<style scoped>
.change-notice { max-height:36vh; overflow:auto; font-variant-numeric:tabular-nums; }
.power,.loot { display:flex; align-items:center; gap:9px; }
.power { background:#53897516; border-inline-start:3px solid currentColor; padding:4px 10px; justify-content:space-between; }
.power b { font:650 24px/1.3 Georgia,serif; }
.power,.changes dd { color:var(--n-success-color,#268566); }
.changes { margin:5px 0 0; }
.changes div { display:flex; justify-content:space-between; gap:14px; padding:3px 1px; border-bottom:1px solid #84948930; }
.changes dd { margin:0; font-weight:700; }
.change-notice .loss { color:var(--n-error-color,#bd5452); }
.loot { padding:6px 0; }
.loot + .loot { border-top:1px solid #84948930; }
.loot strong { overflow-wrap:anywhere; }
.loot small { white-space:nowrap; }
.loot i { display:inline-block; width:6px; height:6px; border-radius:50%; }
.loot b { margin-inline-start:auto; }
</style>
