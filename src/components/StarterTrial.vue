<template>
  <p v-if="player.journeyStage === 'trial' && !player.isNewPlayer" role="status">
    {{ starterDestination(player) === '/character' ? '已获得青竹剑，点左侧「角色」穿戴。' : '前往左侧「秘境」试剑。' }}
  </p>
</template>

<script setup lang="ts">
  import { usePlayerStore } from '../stores/player'
  import { starterDestination } from '../plugins/navigation'
  const player = usePlayerStore()
</script>
