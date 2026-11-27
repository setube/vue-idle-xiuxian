<template>
  <n-layout>
    <n-layout-header bordered>
      <n-page-header>
        <template #title>成就系统</template>
      </n-page-header>
    </n-layout-header>
    <n-layout-content>
      <n-card :bordered="false">
        <n-card v-if="recent.length" title="最近达成" size="small">
          <p v-for="a in recent" :key="a.id"><strong>{{ a.name }}</strong> · 已到账 · {{ rewardSummary(a) }}</p>
        </n-card>
        <n-tabs type="line">
          <n-tab-pane
            v-for="category in achievementCategories"
            :key="category.key"
            :name="category.key"
            :tab="category.name"
          >
            <n-space vertical>
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="achievement in category.achievements" :key="achievement.id">
                  <n-card
                    :class="{ completed: isAchievementCompleted(achievement.id) }"
                    size="small"
                    hoverable
                    @click="showAchievementDetails(achievement)"
                  >
                    <template #header>
                      <n-space justify="space-between" align="center">
                        <span>{{ achievement.name }}</span>
                        <n-tag :type="isAchievementCompleted(achievement.id) ? 'success' : 'default'">
                          {{ isAchievementCompleted(achievement.id) ? '已完成' : '未完成' }}
                        </n-tag>
                      </n-space>
                    </template>
                    <p>{{ achievement.description }}</p>
                    <n-progress
                      type="line"
                      :percentage="getProgress(achievement)"
                      :color="isAchievementCompleted(achievement.id) ? '#18a058' : '#2080f0'"
                      :height="8"
                      :border-radius="4"
                      :show-indicator="true"
                    />
                  </n-card>
                </n-grid-item>
              </n-grid>
            </n-space>
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
  import { usePlayerStore } from '../stores/player'
  import { achievements, getAchievementProgress } from '../plugins/achievements'
  import type { Achievement } from '../plugins/achievements'
  import { useMessage } from 'naive-ui'

  import { computed } from 'vue'
  const playerStore = usePlayerStore()
  const message = useMessage()

  // 获取所有成就类别
  const achievementCategories = Object.entries(achievements).map(([key, value]) => ({
    key: key,
    name: getCategoryName(key),
    achievements: value
  }))

  // 获取成就类别名称
  function getCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      equipment: '装备成就',
      dungeon_explore: '秘境探索',
      dungeon_combat: '秘境战斗',
      cultivation: '修炼成就',
      breakthrough: '突破成就',
      exploration: '探索成就',
      collection: '收集成就',
      resources: '资源成就',
      alchemy: '炼丹成就'
    }
    return categoryNames[category] || '其他成就'
  }

  const byId = new Map(Object.values(achievements).flat().map(a => [a.id, a]))
  const recent = computed(() => playerStore.completedAchievements.slice(-3).reverse()
    .map(id => byId.get(id)).filter((a): a is Achievement => !!a))

  // 检查成就是否完成
  const isAchievementCompleted = (achievementId: string): boolean => {
    return playerStore.completedAchievements.includes(achievementId)
  }

  // 显示成就详情
  const rewardSummary = (achievement: Achievement): string => {
    let rewardText = '奖励：'
    if (achievement.reward) {
      if (achievement.reward.spirit) rewardText += `\n${achievement.reward.spirit} 灵力`
      if (achievement.reward.spiritRate)
        rewardText += `\n${(achievement.reward.spiritRate * 100 - 100).toFixed(0)}% 灵力获取提升`
      if (achievement.reward.herbRate)
        rewardText += `\n${(achievement.reward.herbRate * 100 - 100).toFixed(0)}% 灵草获取提升`
      if (achievement.reward.alchemyRate)
        rewardText += `\n${(achievement.reward.alchemyRate * 100 - 100).toFixed(0)}% 炼丹成功率提升`
      if (achievement.reward.luck) rewardText += `\n${(achievement.reward.luck * 100 - 100).toFixed(0)}% 幸运提升`
    }
    return rewardText.trim()
  }
  const showAchievementDetails = (achievement: Achievement): void => {
    const rewardText = rewardSummary(achievement)
    message.info(`${achievement.name}\n\n${achievement.description}\n\n${rewardText}`, { duration: 5000 })
  }

  // 获取成就进度
  const getProgress = (achievement: Achievement): number => {
    try {
      const progress = getAchievementProgress(playerStore, achievement)
      return Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0
    } catch (error) {
      console.error('成就进度报错:', error)
      return 0
    }
  }
</script>

<style scoped>
  .completed {
    background-color: rgba(24, 160, 88, 0.1);
  }
</style>
