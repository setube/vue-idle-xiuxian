<template>
  <n-space class="home-container" vertical>
    <n-space justify="center">
      <h2>感谢游玩我的放置仙途</h2>
    </n-space>
    <n-space justify="center">
      <p>开始你的修仙之旅吧！</p>
    </n-space>
    <n-space justify="center" v-if="playerStore.isNewPlayer">
      <n-button type="success" @click="receiveNewPlayerGift">领取新手礼包</n-button>
    </n-space>
  </n-space>
</template>

<script setup lang="ts">
  import { usePlayerStore } from '../stores/player'
  import { useMessage } from 'naive-ui'
  import { useRouter } from 'vue-router'
  const router = useRouter()
  const playerStore = usePlayerStore()
  const message = useMessage()

  // 领取新手礼包
  const receiveNewPlayerGift = () => {
    playerStore.spiritStones += 20000
    playerStore.isNewPlayer = false
    router.push('/cultivation')
    message.success('获得20000灵石')
    message.success('新手礼包领取成功')
  }
</script>

<style scoped>
  .home-container {
    padding: 2rem;
  }

  .home-container h2 {
    margin-bottom: 1rem;
    color: #2080f0;
  }

  .home-container p {
    color: #666;
  }
</style>
