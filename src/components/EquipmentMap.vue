<script setup lang="ts">
import type { Equipment, EquipmentSlot, ItemId } from '../types/game'
import GearGlyph from './GearGlyph.vue'
import EquipmentQualityBadge from './EquipmentQualityBadge.vue'

defineProps<{
  names: Record<EquipmentSlot, string>
  equipped: Record<EquipmentSlot, Equipment | null>
  selected?: ItemId
  guideWeapon?: boolean
  unread?: Set<EquipmentSlot>
  mode: 'character' | 'forge'
}>()
defineEmits<{ select: [slot: EquipmentSlot] }>()
import { equipmentSlots as slots } from '../types/game'
</script>
<template>
  <div class="loadout" :class="mode" role="group" aria-label="穿戴部位">
    <img class="hero-art" src="/art/cultivator.svg" alt="青衫修士全身像" />
    <div v-for="key in slots" :key="key" class="socket" :style="{gridArea:key}"
      :class="{ 'guide-target': guideWeapon && key === 'weapon', filled: equipped[key], selected: equipped[key] && equipped[key]?.id === selected}">
      <button type="button" :disabled="mode === 'forge' && !equipped[key]" @click="$emit('select',key)">
        <GearGlyph :slot-type="key" :item-id="equipped[key]?.id" />
        <i v-if="unread?.has(key)" class="new-dot" role="img" aria-label="有新装备" title="有新装备" />
        <span>{{ names[key] }}</span>
        <strong>{{ equipped[key]?.name ?? (guideWeapon && key === 'weapon' ? '穿戴青竹剑' : '空位') }}<template v-if="equipped[key]?.enhanceLevel"> +{{ equipped[key].enhanceLevel }}</template></strong>
        <small v-if="equipped[key]"><EquipmentQualityBadge :item="equipped[key]" /></small>
      </button>
      <slot v-if="equipped[key]" name="actions" :item="equipped[key]" />
    </div>
    <div v-if="$slots.companion" class="companion"><slot name="companion" /></div>
  </div>
</template>
<style scoped>
.socket { position:relative; }
.new-dot { position:absolute; top:4px; right:4px; width:8px; height:8px; border-radius:50%; background:#c83e35; box-shadow:0 0 0 2px #fff; }
.loadout { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); grid-template-areas:
  "head hero necklace" "body hero artifact" "weapon hero wrist" "feet hero ring";
  max-width:720px; margin:12px auto; width:100%; gap:5px 10px;
  background:linear-gradient(90deg,transparent 49.8%,#67887d35 50%,transparent 50.2%); }
.hero-art { grid-area:hero; width:100%; max-height:390px; object-fit:contain; align-self:center; pointer-events:none; }
.character { max-width: 1000px; }
.socket .equip-comparison { grid-column: 1/-1; border-top: 1px solid #83978f38; padding-top: 4px; margin-top: 4px; }
.socket { min-width:0; align-self:center; background:var(--n-color,#f6f8f6); border:1px dashed #83978f66; border-radius:5px; padding:3px; text-align:center; }
.filled {border-style:solid;border-color:#648a7a;}
.companion { grid-area:companion; min-width:0; align-self:center; }
.selected {outline:2px solid #438b74;outline-offset:1px;}
.socket button { width:100%; background:none;color:inherit;border:0;cursor:pointer;display:grid;grid-template-columns:32px 1fr;align-items:center;text-align:start;gap:0 6px;padding:4px;font:inherit; }
.socket button:disabled {cursor:default;}
.socket button .gear-glyph {grid-row:span 2;}
.socket strong,.socket small {overflow-wrap:anywhere;min-width:0;}
.socket small {grid-column:1/-1;}
.socket:not(.filled) strong {opacity:.6;font-weight:400;font-size:12px;}
@media(max-width:540px){.loadout{gap:4px;}.socket button{grid-template-columns:1fr;text-align:center;justify-items:center;}.socket button .gear-glyph{grid-row:auto;}}
</style>
<style scoped>
.character {
  box-sizing:border-box; padding:14px; gap:5px 12px;
  grid-template-columns:minmax(0,1fr) minmax(64px,.85fr) minmax(0,1fr);
  border-block:1px solid #849d8f44;
  background:linear-gradient(90deg,transparent,#829c8620 50%,transparent);
}
.character .hero-art { max-height:330px; }
.character .socket { border:0; border-bottom:1px solid #87988c44; background:transparent; border-radius:0; padding:0; }
.character .socket button { min-height:44px; grid-template-columns:32px minmax(0,1fr); text-align:start; justify-items:start; }
.character .socket button .gear-glyph { grid-row:span 2; }
.character .socket:not(.filled):not(.guide-target) strong { display:none; }
.character .socket.filled { background:#809e8613; }
.character .socket button:hover,.character .socket button:focus-visible { background:#799b852c; }
@media(max-width:540px){
  .character { padding:6px 0;gap:2px 4px;grid-template-columns:minmax(0,1fr) minmax(50px,.58fr) minmax(0,1fr); }
  .character .socket button {grid-template-columns:23px minmax(0,1fr);gap:2px;padding:3px;}
  .character .socket button .gear-glyph {width:23px;height:25px;}
}
</style>
