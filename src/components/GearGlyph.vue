<script setup lang="ts">
import type { EquipmentSlot } from '../types/game'
import { equipmentArt } from '../plugins/illustrations'
defineProps<{ slotType: EquipmentSlot; itemId?: string | number }>()
const paths: Record<EquipmentSlot, string> = {
  weapon: 'M6 26L23 6l5-2-1 6-18 18z M6 18l8 7 M4 27l3 2',
  head: 'M5 22l2-10 6 4 3-10 4 10 6-4 1 10z M6 25h20',
  body: 'M10 5l6 4 6-4 7 6-4 7-3-2 1 12H9l1-12-4 2-4-7z M11 6l9 14-6 8',
  feet: 'M10 6h11l-1 12 6 3 2 5H6v-6l4-3z M7 23h18',
  wrist: 'M6 13l13-8 8 13-13 9z M9 15l11-7 M13 23l11-7',
  necklace: 'M4 7q3 12 12 13Q25 19 28 7 M16 18l5 5-5 6-5-6z',
  ring: 'M11 12a9 9 0 1 0 10 0 M16 4l6 5-6 7-6-7z',
  artifact: 'M16 3l5 9 7 4-7 5-5 9-5-9-7-5 7-4z M16 10l4 6-4 7-4-7z'
}
</script>
<template><img v-if="equipmentArt(itemId)" class="gear-glyph" :src="equipmentArt(itemId)" alt="" /><svg v-else class="gear-glyph" viewBox="0 0 32 32" aria-hidden="true"><path :d="paths[slotType]" /></svg></template>
<style scoped>
.gear-glyph { width: 32px; height: 32px; flex: none; padding: 4px; box-sizing: border-box; color: #527771; background: #e6efec; border-radius: 5px; }
path { fill: #c5d8d2; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: round; stroke-linecap: round; }
</style>
