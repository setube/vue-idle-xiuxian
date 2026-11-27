<template>
  <n-alert v-if="visibleGain > 0" type="success" title="离线回灵" closable @close="visibleGain = 0">
    离开期间恢复了 {{ Number(visibleGain.toFixed(2)).toLocaleString() }} 灵力。最多累计 8 小时，达到灵力容量后停止。
  </n-alert>
  <n-card v-if="player.canClaimFoundationGear" title="筑基初成 · 自选一件" size="small">
    <div class="foundation-choices">
      <section v-for="item in foundationGear" :key="item.id">
        <GearGlyph :slot-type="item.type" :item-id="item.id" /><strong>{{ item.name }}</strong>
        <EquipmentQualityBadge :item="item" />
        <EquipmentComparison :candidate="item" :current="player.equippedArtifacts[item.type]" />
        <n-button size="small" :aria-label="'领取' + item.name" @click="claim(item)">领取装备</n-button>
      </section>
    </div>
  </n-card>
</template>

<script setup lang="ts">
  import GearGlyph from './GearGlyph.vue'
  import EquipmentComparison from './EquipmentComparison.vue'
  import EquipmentQualityBadge from './EquipmentQualityBadge.vue'
  import { foundationGear } from '../plugins/foundation-reward'
  import type { Equipment } from '../types/game'
  import { computed, h, ref, watch } from 'vue'
  import { useGameNotices } from '../plugins/game-notices'
  import ChangeNotice from './ChangeNotice.vue'
  import { formatStatValue } from '../plugins/stats'
  import { equipmentDifferences } from '../plugins/equipment-stats'
  import { getRealmName } from '../plugins/realm'
  import { achievements, checkAchievements } from '../plugins/achievements'
  import { usePlayerStore } from '../stores/player'
  import { useExplorationStore } from '../stores/exploration'

  const props = defineProps<{ offlineGain: number }>()
  const visibleGain = ref(props.offlineGain)
  watch(() => props.offlineGain, gain => { visibleGain.value = gain })

  const player = usePlayerStore()
  const notify = useGameNotices()
  const exploration = useExplorationStore()
  watch(() => exploration.latestResult, result => {
    if (!result) return
    notify(result.place, '灵力 −' + result.cost.toLocaleString('zh-CN'))
    for (const line of result.lines) notify(result.place, line)
  })
  const ownedGear = computed(() => {
    const gear = new Map<Equipment['id'], Equipment>()
    for (const item of player.items) {
      if (item.type !== 'pill' && item.type !== 'pet') gear.set(item.id, item)
    }
    for (const item of Object.values(player.equippedArtifacts)) {
      if (item) gear.set(item.id, item)
    }
    return gear
  })
  const attributes = computed(() => ({
    ...player.effectiveBaseAttributes, ...player.effectiveCombatAttributes,
    ...player.effectiveCombatResistance, ...player.effectiveSpecialAttributes,
    spiritRate: player.effectiveSpiritRate, cultivationRate: player.effectiveCultivationRate
  }))
  watch([ownedGear, () => player.combatPower, () => player.level, attributes], ([gear, power, level, stats], [previous, before, oldLevel, oldStats]) => {
    const loot = [...gear.values()].filter(item => !previous.has(item.id))
    const delta = Number((power - before).toFixed(2))
    const breakthrough = level > oldLevel
    const changes = Object.entries(equipmentDifferences(stats, oldStats))
      .filter(([stat, value]) => formatStatValue(stat, Math.abs(value)) !== formatStatValue(stat, 0))
    if (!loot.length && !delta && !breakthrough && !changes.length) return
    if (breakthrough) notify('境界突破', getRealmName(level).name)
    for (const item of loot) {
      notify('获得装备', () => h(ChangeNotice, { power: 0, changes: [], loot: [{ item, count: 1 }] }))
    }
    if (delta) notify('战力变化', () => h(ChangeNotice, { power: delta, changes: [], loot: [] }))
    for (const change of changes) notify('属性变化', () => h(ChangeNotice, { power: 0, changes: [change], loot: [] }))
  })
  function claim(item: Equipment) {
    player.claimFoundationGear(item.id)
  }
  const milestones = Object.values(achievements).flat()
  // Vue only reevaluates a milestone when the values used by its condition change.
  const eligible = milestones.map(achievement => computed(() =>
    !player.completedAchievements.includes(achievement.id) && achievement.condition(player)
  ))
  watch(eligible, flags => {
    const earned = checkAchievements(player, milestones.filter((_, index) => flags[index]))
    if (!earned.length) return
    for (const achievement of earned) {
      notify('成就达成', achievement.name)
      if (achievement.reward.spirit) notify(achievement.name, '灵力 +' + achievement.reward.spirit.toLocaleString())
    }
  }, { immediate: true })
</script>

<style scoped>
  .foundation-choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 16px; }
  .foundation-choices section { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .foundation-choices button { margin-top: auto; }
</style>
