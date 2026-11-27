<template>
  <n-layout>
    <n-layout-header bordered>
      <n-page-header>
        <template #title>探索</template>
      </n-page-header>
    </n-layout-header>
    <n-layout-content>
      <n-card :bordered="false">
        <n-space vertical>
          <ExplorationStatus />
          <StarterTrial />
          <n-grid cols="1 640:2" :x-gap="12">
            <n-grid-item v-for="location in availableLocations" :key="location.id">
              <n-card :title="location.name" size="small">
                <n-space vertical>
                  <n-text>{{ explore.isFirstVisit(location) ? '铁匠备好了一把青竹剑，攻击 +12。' : location.description }}</n-text>
                  <n-text>{{ explore.isFirstVisit(location) ? '首次免费' : '每次消耗 ' + location.spiritCost + ' 灵力' }} · {{ getRealmName(location.minLevel).name }}可进入</n-text>
                  <n-text depth="3">药材 · {{ location.herbIds.map(herbName).join('、') }}</n-text>
                  <div v-if="location.id === 'newbie_village'" class="village-progress">
                    <span>{{ villageVisits < 3 ? '再探索 ' + (3 - villageVisits) + ' 次发现村后药圃' : villageVisits < 6 ? '再探索 ' + (6 - villageVisits) + ' 次，采药量提升至 2 株' : '路线已熟悉 · 每次可采 2 株' }}</span>
                    <progress :value="Math.min(6, villageVisits)" max="6" aria-label="新手村探索进度" />
                  </div>
                  <n-text v-else depth="3">已探索 {{ playerStore.locationVisits[location.id] ?? 0 }} 次</n-text>
                  <n-space>
                    <n-button v-if="explore.isFirstVisit(location)" type="primary" :class="{ 'guide-target': !playerStore.isNewPlayer }"
                      :disabled="!!explore.target" @click="explore.visit(location)">免费探索新手村</n-button>
                    <HoldButton v-else v-slot="{ count }" type="primary" :interval="200"
                      :disabled="!!explore.target || playerStore.spirit < explore.cost(location)"
                      title="按住鼠标或空格连续探索" @activate="explore.visit(location)">
                      {{ count ? '连续探索 · ' + count + ' 次' : '探索' }}
                    </HoldButton>
                    <n-button v-if="!explore.isFirstVisit(location)" :disabled="!!explore.target && explore.target.id !== location.id"
                      @click="explore.toggle(location)">{{ explore.target?.id === location.id ? '停止' : '自动探索' }}</n-button>
                  </n-space>
                  <div v-if="location.id === 'newbie_village' && villageVisits >= 3">
                    <p>村后药圃 · {{ location.spiritCost }} 灵力 / 次</p>
                    <n-space><n-button v-for="id in gardenHerbs" :key="id" size="small" :disabled="!!explore.target || playerStore.spirit < location.spiritCost" @click="explore.visit(location, id)">采{{ herbName(id) }} ×{{ villageVisits >= 6 ? 2 : 1 }}</n-button></n-space>
                  </div>
                </n-space>
              </n-card>
            </n-grid-item>
          </n-grid>
          <div v-if="lockedLocations.length" class="locked-locations">
            <span v-for="place in lockedLocations" :key="place.id">{{ place.name }} · {{ getRealmName(place.minLevel).name }}开放</span>
          </div>
          <n-divider>探索统计</n-divider>
          <n-descriptions :column="2" bordered>
            <n-descriptions-item label="探索次数">
              <NumericValue :value="playerStore.explorationCount" />
            </n-descriptions-item>
            <n-descriptions-item label="灵石数量">
              <NumericValue :value="playerStore.spiritStones" />
            </n-descriptions-item>
            <n-descriptions-item label="灵草数量">
              {{ playerStore.herbs.reduce((sum, herb) => sum + (herb.count ?? 1), 0) }}
            </n-descriptions-item>
            <n-descriptions-item label="丹方残页">
              <NumericValue :value="Object.values(playerStore.pillFragments || {}).reduce((a, b) => a + b, 0)" />
            </n-descriptions-item>
          </n-descriptions>
        </n-space>
      </n-card>
      <n-card title="探索日志" size="small">
        <template #header-extra><n-button v-if="explore.logs.length" size="small" @click="explore.logs = []">清空日志</n-button></template>
        <n-scrollbar style="max-height: 200px">
          <p v-for="(entry, index) in [...explore.logs].reverse()" :key="index">{{ entry.time }}　{{ entry.content }}</p>
          <n-empty v-if="!explore.logs.length" description="暂无日志" />
        </n-scrollbar>
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
  import HoldButton from '../components/HoldButton.vue'
  import NumericValue from '../components/NumericValue.vue'
  import { computed } from 'vue'
  import StarterTrial from '../components/StarterTrial.vue'
  import { usePlayerStore } from '../stores/player'
  import { useExplorationStore } from '../stores/exploration'
  import { herbName } from '../plugins/herbs'
  import { locations } from '../plugins/locations'
  import { getRealmName } from '../plugins/realm'
  import ExplorationStatus from '../components/ExplorationStatus.vue'
  const playerStore = usePlayerStore()
  const explore = useExplorationStore()
  const gardenHerbs = ['spirit_grass', 'cloud_flower'] as const
  const villageVisits = computed(() => playerStore.locationVisits.newbie_village ?? 0)
  const lockedLocations = computed(() => locations.filter(loc => playerStore.level < loc.minLevel))
  const availableLocations = computed(() => locations.filter(loc => playerStore.level >= loc.minLevel))
</script>

<style scoped>
  .village-progress { display:grid; gap:4px; }
  .village-progress progress { width:100%; height:7px; accent-color:#527f69; }
  .locked-locations { display:flex; flex-wrap:wrap; gap:6px 18px; font-size:13px; }
  .n-space {
    width: 100%;
  }

  .n-card {
    margin-bottom: 12px;
  }

  .n-collapse {
    margin-top: 12px;
  }
</style>
