<template>
  <n-config-provider :theme="playerStore.isDarkMode ? darkTheme : null">
    <n-message-provider placement="bottom-right" :max="3">
      <n-dialog-provider>
        <n-notification-provider placement="top-right" :max="3">
        <n-spin :show="isLoading" description="正在加载游戏数据...">
          <div class="game-shell" :class="{ 'night-shell': playerStore.isDarkMode }">
            <header class="resource-bar">
              <div class="game-name"><n-icon :size="24"><CompassOutlined /></n-icon><span>我的放置仙途</span></div>
              <div class="resource-values" aria-label="角色资源">
                <router-link to="/character" class="realm-meter" title="查看修炼进度">
                  <small>境界</small><strong>{{ getRealmName(playerStore.level).name }}</strong>
                </router-link>
                <div class="power-meter" title="按当前生效的战斗属性估算，含装备与出战灵宠加成"><small>战斗力</small><b>{{ playerStore.combatPower.toLocaleString('zh-CN') }}</b></div>
                <div class="cultivation-meter"><small>修为 <span class="resource-rate">+{{ playerStore.cultivationPlan.gain }}/次</span></small><b>{{ number(playerStore.cultivation) }} / {{ number(playerStore.maxCultivation) }}</b>
                  <progress aria-label="修为进度" :value="playerStore.cultivation" :max="playerStore.maxCultivation" />
                </div>
                <div><small>灵力 <span class="resource-rate">+{{ Number(playerStore.effectiveSpiritRate.toFixed(2)) }}/秒</span></small><b>{{ number(playerStore.spirit) }}</b></div>
                <div><small>灵石</small><b>{{ number(playerStore.spiritStones) }}</b></div>
                <div><small>强化石</small><b>{{ number(playerStore.reinforceStones) }}</b></div>
              </div>
              <n-button quaternary circle :aria-label="playerStore.isDarkMode ? '切换到浅色' : '切换到深色'" @click="playerStore.toggle">
                <n-icon :size="18"><Sunny v-if="playerStore.isDarkMode" /><Moon v-else /></n-icon>
              </n-button>
            </header>
            <aside class="game-rail">
              <nav aria-label="游戏导航">
                <div class="rail-group" v-for="group in navGroups" :key="group.title">
                  <h2>{{ group.title }}</h2>
                  <div v-for="entry in group.entries" :key="entry.path">
                    <router-link :to="entry.path" class="rail-link" :class="{ selected: activeEntry(entry.path), guided: guideLabel(entry.path) }"
                      :aria-current="activeEntry(entry.path) ? 'page' : undefined">
                      <n-icon :size="18"><component :is="entry.icon" /></n-icon>{{ entry.label }}
                      <small v-if="guideLabel(entry.path)" class="rail-hint">{{ guideLabel(entry.path) }}</small>
                    </router-link>
                  </div>
                </div>
              </nav>
              <div v-if="playerStore.autoCultivationEnabled || exploration.target" class="rail-status">
                <span v-if="playerStore.autoCultivationEnabled">自动修炼已开启</span>
                <span v-if="exploration.target">自动探索 · {{ exploration.target.name }}</span>
              </div>
            </aside>
            <main ref="mainPane" class="play-area" aria-label="当前玩法">
              <div class="play-content">
                <GameFeedback v-if="!isLoading" :offline-gain="offlineGain" />
                <router-view v-if="!isLoading" />
              </div>
            </main>
          </div>
        </n-spin>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import GameFeedback from './components/GameFeedback.vue'
  import { starterDestination } from './plugins/navigation'

  import { useRouter, useRoute } from 'vue-router'
  import { usePlayerStore } from './stores/player'
  import { useExplorationStore } from './stores/exploration'
  import { computed, ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
  import { NIcon, darkTheme } from 'naive-ui'
  import {
    UserOutlined,
    ToolOutlined,
    CompassOutlined,
    TrophyOutlined,
    SettingOutlined,
    MedicineBoxOutlined,
    GiftOutlined,
    HomeOutlined,
    SmileOutlined,
  } from '@ant-design/icons-vue'
  import { Moon, Sunny, Flash, ShieldOutline, PawOutline } from '@vicons/ionicons5'
  import { getRealmName } from './plugins/realm'

  const router = useRouter()
  const route = useRoute()
  const playerStore = usePlayerStore()
  const spiritWorker = shallowRef<Worker | null>(null)
  const offlineGain = ref(0)
  const isLoading = ref(true) // 添加加载状态

  // 初始化数据加载
  playerStore.initializePlayer().then(async gain => {
    await router.isReady()
    if (!playerStore.isNewPlayer && playerStore.journeyStage === 'done' && route.path === '/') await router.replace('/cultivation')
    offlineGain.value = gain
    startAutoGain()
    isLoading.value = false
  }).catch(error => {
    console.error('游戏数据加载失败', error)
    isLoading.value = false
  })

  const mainPane = ref<HTMLElement>()
  watch(() => route.path, () => mainPane.value?.scrollTo(0, 0), { flush: 'post' })
  const formatNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })
  const number = (value: number) => formatNumber.format(Math.floor(value))
  const activeEntry = (path: string) => {
    return (route.matched.at(-1)?.aliasOf?.path ?? route.path) === path
  }
  const nextStep = computed(() => starterDestination(playerStore))
  const hasNewGear = computed(() => playerStore.items.some(item => item.type !== 'pill' && item.type !== 'pet' && item.unread))
  function guideLabel(path: string) {
    if (route.path === path) return ''
    if (path === nextStep.value) {
      if (path === '/character') return '穿戴'
      if (path === '/exploration') return '领剑'
      if (path === '/dungeon') return '试剑'
      return '领礼包'
    }
    return path === '/character' && hasNewGear.value ? '新装备' : ''
  }
  const navGroups = computed(() => [
    { title: '修行', entries: [
      ...(playerStore.isNewPlayer || playerStore.journeyStage !== 'done' ? [{ path: '/', label: '入门', icon: HomeOutlined }] : []),
      { path: '/character', label: '角色', icon: UserOutlined },
      { path: '/equipment', label: '装备', icon: ShieldOutline },
      { path: '/forge', label: '强化', icon: ToolOutlined },
      { path: '/pets', label: '灵宠', icon: PawOutline },
    ] },
    { title: '历练', entries: [
      { path: '/exploration', label: '探索', icon: CompassOutlined },
      { path: '/dungeon', label: '秘境', icon: Flash },
      { path: '/alchemy', label: '炼丹', icon: MedicineBoxOutlined },
      { path: '/gacha', label: '抽奖', icon: GiftOutlined }
    ] },
    { title: '其他', entries: [
      { path: '/achievements', label: '成就', icon: TrophyOutlined },
      { path: '/settings', label: '设置', icon: SettingOutlined },
      ...(playerStore.isGMMode ? [{ path: '/gm', label: 'GM调试', icon: SmileOutlined }] : [])
    ] }
  ])
  const baseGainRate = 1
  const exploration = useExplorationStore()
  const startAutoGain = () => {
    if (spiritWorker.value) return
    spiritWorker.value = new Worker(new URL('./workers/spirit.ts', import.meta.url), { type: 'module' })
    spiritWorker.value.onmessage = e => {
      if (e.data.type === 'gain') {
        const now = Date.now()
        if (playerStore.lastSpiritTickAt > 0 && now - playerStore.lastSpiritTickAt >= 3000) {
          // The final second is credited by the normal online tick below.
          const recovered = playerStore.recoverOfflineSpirit(now - 1000)
          if (recovered > 0) offlineGain.value = recovered
        }
        playerStore.lastSpiritTickAt = now
        playerStore.totalCultivationTime += 1
        playerStore.gainSpirit(baseGainRate)
        playerStore.tickDungeonIdle(now)
        exploration.tick(now)
      }
    }
    spiritWorker.value.postMessage({ type: 'start' })
  }

  const flushOnLeave = () => {
    if (!isLoading.value) {
      playerStore.tickDungeonIdle()
      void playerStore.flushData().catch(error => console.error('保存进度失败', error))
    }
  }
  const resumeFromCache = (event: PageTransitionEvent) => {
    if (event.persisted && !isLoading.value) playerStore.tickDungeonIdle(Date.now(), true)
  }
  onMounted(() => {
    window.addEventListener('pagehide', flushOnLeave)
    window.addEventListener('pageshow', resumeFromCache)
  })

  onUnmounted(() => {
    window.removeEventListener('pagehide', flushOnLeave)
    window.removeEventListener('pageshow', resumeFromCache)
    spiritWorker.value?.terminate()
    spiritWorker.value = null
    void playerStore.saveData()
  })

</script>

<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Source Sans 3', 'Segoe UI', 'Microsoft YaHei', sans-serif; }
  .game-shell {
    --paper: #f3f5f0; --panel: #fff; --ink: #20382e; --muted: #53695d; --line: #d8e0d8;
    --rail: #1b3931; --rail-text: #e0ece4; --focus: #a6d7ac;
    height: 100vh; height: 100dvh; display: grid; grid-template-columns: 184px minmax(0,1fr);
    grid-template-rows: auto minmax(0,1fr); color: var(--ink); background: var(--paper);
  }
  .night-shell { --paper: #151c1a; --panel: #202a25; --ink: #e9efe8; --muted: #b3c1b6; --line: #39463e; --rail: #152a24; }
  .resource-bar { grid-column: 1/-1; display: flex; align-items: center; padding-right: 22px; gap: 20px; min-height: 78px; background: var(--panel); border-bottom: 1px solid var(--line); }
  .game-name { flex: 0 0 184px; align-self: stretch; display: flex; gap: 10px; align-items: center; justify-content: center; background: var(--rail); color: #eef5e9; font: 650 19px/1.3 'STIX Two Text','Songti SC','SimSun',serif; letter-spacing: .05em; }
  .game-name .n-icon { color: #badab6; }
  .resource-values { display: grid; grid-template-columns: minmax(88px,1fr) minmax(78px,1fr) minmax(130px,1.7fr) repeat(3,minmax(72px,1fr)); max-width: 1040px; gap: 20px; flex: 1; }
  .resource-values > * { min-width: 0; padding-inline-end: 12px; border-inline-end: 1px solid var(--line); display: flex; flex-direction: column; justify-content: center; }
  .resource-values > :last-child { border: 0; }
  .resource-rate { display:inline-block; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .resource-values small { color: var(--muted); font-size: 12px; line-height: 1.5; }
  .resource-values b, .realm-meter strong { font-size: 17px; line-height: 1.5; font-variant-numeric: tabular-nums; font-weight: 650; overflow-wrap: anywhere; }
  .realm-meter { color: inherit; text-decoration: none; }
  .realm-meter:hover strong { text-decoration: underline; }
  .cultivation-meter progress { width: 100%; height: 5px; border: 0; border-radius: 3px; overflow: hidden; accent-color: #46816b; }
  .cultivation-meter progress::-webkit-progress-bar { background: var(--line); }
  .cultivation-meter progress::-webkit-progress-value { background: #46816b; }
  .resource-bar > button { margin-left: auto; flex-shrink: 0; color: var(--ink); }
  .game-rail { background: var(--rail); color: var(--rail-text); overflow-y: auto; padding: 14px 12px 20px; }
  .rail-group + .rail-group { border-top: 1px solid #ffffff26; margin-top: 12px; padding-top: 8px; }
  .rail-group h2 { font-size: 11px; font-weight: 500; letter-spacing: .12em; color: #adc8ba; margin: 6px 12px; }
  .rail-link, .rail-subnav a { color: inherit; text-decoration: none; display: flex; align-items: center; border-radius: 5px; }
  .rail-link { padding: 7px 12px; gap: 12px; min-height: 34px; }
  .rail-link:hover, .rail-subnav a:hover { background: #ffffff15; }
  .rail-link.guided { outline: 1px solid #dec07a; outline-offset: -1px; background: #ffd88514; }
  .rail-hint { margin-left: auto; color: #ffdf99; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .game-shell .guide-target { outline: 2px solid #b08229; outline-offset: 2px; }
  .rail-link.selected { background: #d9ebd9; color: #153b2b; font-weight: 650; }
  .rail-subnav { margin: 4px 0 6px 20px; padding-left: 12px; border-left: 1px solid #ffffff40; }
  .rail-subnav a { min-height: 28px; padding-left: 10px; font-size: 13px; }
  .rail-subnav a.selected { color: var(--focus); font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
  .rail-status { display: grid; gap: 4px; padding: 14px 12px 0; color: var(--focus); font-size: 12px; }
  .play-area { min-width: 0; overflow: auto; scrollbar-gutter: stable; }
  .play-content { max-width: 1380px; margin-inline: auto; padding: clamp(16px, 2.4vw, 36px); }
  .play-content > .n-layout, .play-content > .n-card, .play-content > div > .n-card { border: 1px solid var(--line); border-radius: 8px; }
  .play-content > .n-layout > .n-layout-scroll-container > .n-layout-header { padding: 16px 24px; }
  .play-content > .n-alert { margin-bottom: 12px; }
  .game-shell a:focus-visible { outline: 2px solid #6baf8a; outline-offset: 2px; }
  @media(max-width: 780px) {
    .game-shell { height: auto; min-height: 100dvh; display: block; }
    .resource-bar { flex-wrap: wrap; min-height: 0; padding: 10px 14px; gap: 8px; }
    .game-name { background: transparent; color: var(--ink); flex: auto; justify-content: start; }
    .resource-values { order: 3; flex-basis: 100%; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 5px; }
    .resource-values b,.realm-meter strong { font-size: 13px; }
    .game-rail { padding: 6px; }
    .game-rail nav,.rail-group { display: flex; flex-wrap: wrap; gap: 2px; }
    .rail-group + .rail-group,.rail-subnav { border: 0; margin: 0; padding: 0; }
    .rail-group h2,.rail-link .n-icon { display: none; }
    .rail-link,.rail-subnav a { padding: 4px 8px; }
    .rail-subnav { display: flex; flex-wrap: wrap; }
    .play-area { overflow: visible; }
  }
</style>
