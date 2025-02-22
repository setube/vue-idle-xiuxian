<script setup>
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from './stores/player'
import { h } from 'vue'
import { NIcon, darkTheme } from 'naive-ui'
import { BookOutlined, ExperimentOutlined, CompassOutlined, TrophyOutlined, SettingOutlined, MedicineBoxOutlined, GiftOutlined, HomeOutlined, SmileOutlined } from '@ant-design/icons-vue'
import { Moon, Sunny, Flash } from '@vicons/ionicons5'
import { getRealmName } from './plugins/realm'
import { formatNumberToChineseUnit } from './plugins/utils'

const router = useRouter()
const route = useRoute()
const playerStore = usePlayerStore()

// 灵力获取相关配置
const baseGainRate = 1  // 基础灵力获取率
const autoGainInterval = 1000  // 自动获取灵力的间隔（毫秒）
const spiritTimer = ref(null)
const version = localStorage.getItem('version')

const isversion = ref(false)
isversion.value = playerStore.version != version

// 清空数据
const clickClearData = () => {
    // 清空localStorage中的数据
    if (playerStore.level >= 1 && (!version || playerStore.version != version)) {
        localStorage.removeItem('playerData')
        localStorage.removeItem('version')
        localStorage.setItem('version', playerStore.version)
        isversion.value = false
        location.reload()
    }
}

// 自动获取灵力
const startAutoGain = () => {
    if (spiritTimer.value) return
    spiritTimer.value = setInterval(() => {
        playerStore.totalCultivationTime += 1;
        playerStore.gainSpirit(baseGainRate)
    }, autoGainInterval)
}

// 停止自动获取
const stopAutoGain = () => {
    if (spiritTimer.value) {
        clearInterval(spiritTimer.value)
        spiritTimer.value = null
    }
}

onMounted(() => {
  playerStore.initializePlayer()
  startAutoGain()  // 启动自动获取灵力
})

onUnmounted(() => {
  stopAutoGain()  // 清理定时器
})

// 确保playerStore初始化
if (!playerStore.spirit) {
  playerStore.initializePlayer()
}

// 图标
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// 菜单选项
const menuOptions = [,
  ...(!playerStore.spirit ? [{
    label: '欢迎',
    key: '',
    icon: renderIcon(HomeOutlined)
  }] : []),
  {
    label: '修炼',
    key: 'cultivation',
    icon: renderIcon(BookOutlined)
  },
  {
    label: '背包',
    key: 'inventory',
    icon: renderIcon(ExperimentOutlined)
  },
  {
    label: '抽奖',
    key: 'gacha',
    icon: renderIcon(GiftOutlined)
  },
  {
    label: '炼丹',
    key: 'alchemy',
    icon: renderIcon(MedicineBoxOutlined)
  },
  {
    label: '奇遇',
    key: 'exploration',
    icon: renderIcon(CompassOutlined)
  },
  {
    label: '秘境',
    key: 'dungeon',
    icon: renderIcon(Flash)
  },
  {
    label: '成就',
    key: 'achievements',
    icon: renderIcon(TrophyOutlined)
  },
  {
    label: '设置',
    key: 'settings',
    icon: renderIcon(SettingOutlined)
  },
  ...(playerStore.isGMMode ? [{
    label: 'GM调试',
    key: 'gm',
    icon: renderIcon(SmileOutlined)
  }] : []),
]

// 获取当前路由对应的菜单key
const getCurrentMenuKey = () => {
  const path = route.path.slice(1) // 移除开头的斜杠
  return path || 'cultivation' // 如果是根路径，默认返回cultivation
}

// 菜单点击事件
const handleMenuClick = (key) => {
  router.push(`/${key}`)
}

</script>

<template>
  <n-config-provider :theme="playerStore.isDarkMode ? darkTheme : null">
    <n-message-provider>
      <n-dialog-provider>
        <n-layout>
          <n-layout-header bordered>
            <div class="header-content">
              <n-page-header>
                <template #title>
                    我的放置仙途
                </template>
                <template #extra>
                    <n-button
                        quaternary
                        circle
                        @click="playerStore.toggleDarkMode"
                    >
                        <template #icon>
                        <n-icon>
                            <Sunny v-if="playerStore.isDarkMode" />
                            <Moon v-else />
                        </n-icon>
                        </template>
                    </n-button>
                </template>
              </n-page-header>
              <n-scrollbar x-scrollable trigger="none">
              <n-menu
                  mode="horizontal"
                  :options="menuOptions"
                  :value="getCurrentMenuKey()"
                  @update:value="handleMenuClick"
              />
            </n-scrollbar>
            </div>
          </n-layout-header>
          <n-layout-content>
            <div class="content-wrapper">
              <n-card>
                <n-space vertical>
                  <n-descriptions bordered>
                    <n-descriptions-item label="道号">
                      {{ playerStore.name }}
                    </n-descriptions-item>
                    <n-descriptions-item label="境界">
                      {{ getRealmName(playerStore.level) }}
                    </n-descriptions-item>
                    <n-descriptions-item label="修为">
                      {{ formatNumberToChineseUnit(playerStore.cultivation) }} / {{ formatNumberToChineseUnit(playerStore.maxCultivation) }}
                    </n-descriptions-item>
                    <n-descriptions-item label="灵力">
                      {{ formatNumberToChineseUnit(playerStore.spirit) }}
                    </n-descriptions-item>
                    <n-descriptions-item label="灵石">
                      {{ formatNumberToChineseUnit(playerStore.spiritStones) }}
                    </n-descriptions-item>
                    <n-descriptions-item label="强化石">
                      {{ formatNumberToChineseUnit(playerStore.reinforceStones) }}
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-progress
                    type="line"
                    :percentage="Number(((playerStore.cultivation / playerStore.maxCultivation) * 100).toFixed(2))"
                    indicator-text-color="rgba(255, 255, 255, 0.82)"
                    rail-color="rgba(32, 128, 240, 0.2)"
                    color="#2080f0"
                    :show-indicator="true"
                    indicator-placement="inside"
                    processing
                  />
                </n-space>
              </n-card>
              <router-view />
            </div>
          </n-layout-content>
        </n-layout>
      </n-dialog-provider>
    </n-message-provider>
    <n-modal v-model:show="isversion" preset="dialog">
        <n-card title="版本更新提示" :bordered="false">
            检测到游戏版本已更新，为了确保游戏正常运行，需要清理旧版本数据。
            <template #footer>
                <n-button type="primary" @click="clickClearData">确定</n-button>
            </template>
        </n-card>
    </n-modal>
  </n-config-provider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
:root {
    --n-color: rgb(16, 16, 20);
    --n-text-color: rgba(255, 255, 255, 0.82);
}

html.dark {
    background-color: var(--n-color);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.n-config-provider, 
.n-layout {
    height: 100%;
    min-height: 100vh;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.n-card {
  margin-bottom: 16px;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
}

.n-page-header__title {
    padding: 16px 0;
    margin: 0 16px;
}

::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background-color: rgba(0, 0, 0, 0.03);
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 3px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

html.dark ::-webkit-scrollbar-track {
  background-color: rgba(255, 255, 255, 0.03);
}

html.dark ::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

html.dark ::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
