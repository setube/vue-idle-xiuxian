<template>
  <n-card class="home-container" :title="playerStore.journeyStage === 'done' ? '洞府' : '初入仙途'">
    <p>{{ playerStore.isNewPlayer ? '村口的铁匠为你留了一把青竹剑。领下 20,000 灵石路费，去找他吧。' : playerStore.journeyStage === 'village' ? '前往新手村，首次探索免费。' : playerStore.journeyStage === 'trial' ? (starterDestination(playerStore) === '/character' ? '已获得青竹剑，去角色页穿戴。' : '去秘境试剑。') : '回到洞府，继续积累修为。' }}</p>
    <n-button v-if="playerStore.isNewPlayer" type="primary" @click="receiveNewPlayerGift">领取新手礼包</n-button>
    <n-button v-else-if="playerStore.journeyStage === 'done'" @click="$router.push('/cultivation')">继续修炼</n-button>
  </n-card>
</template>

<script setup lang="ts">
  import { usePlayerStore } from '../stores/player'
  import { useMessage } from 'naive-ui'
  import { starterDestination } from '../plugins/navigation'
  const playerStore = usePlayerStore()
  const message = useMessage()

  // 领取新手礼包
  const receiveNewPlayerGift = () => {
    if (!playerStore.isNewPlayer) return
    playerStore.spiritStones += 20000
    playerStore.isNewPlayer = false
    void playerStore.saveData()
    message.success('新手礼包已领取：获得 20,000 灵石。')
  }
</script>

<style scoped>
  .home-container { border-inline-start: 3px solid #399275; }
  .home-container p { margin: 0 0 18px; }
</style>
