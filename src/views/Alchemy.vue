<template>
  <n-card title="炼丹">
    <n-tabs type="line" :value="activeTab" @update:value="selectTab">
    <n-tab-pane name="craft" tab="炼制">
    <n-space vertical>
      <template v-if="unlockedRecipes.length > 0">
        <n-divider>丹方选择</n-divider>
        <!-- 丹方选择 -->
        <n-grid :cols="2" :x-gap="12">
          <n-grid-item v-for="recipe in unlockedRecipes" :key="recipe.id">
            <n-card :title="recipe.name" size="small">
              <n-space vertical>
                <n-text depth="3">{{ recipe.description }}</n-text>
                <n-space>
                  <n-tag type="info">{{ pillGrades[recipe.grade].name }}</n-tag>
                  <n-tag type="warning">{{ pillTypes[recipe.type].name }}</n-tag>
                </n-space>
                <n-button
                  @click="selectRecipe(recipe)"
                  block
                  :type="selectedRecipe?.id === recipe.id ? 'primary' : 'default'"
                >
                  {{ selectedRecipe?.id === recipe.id ? '已选择' : '选择' }}
                </n-button>
              </n-space>
            </n-card>
          </n-grid-item>
        </n-grid>
      </template>
      <n-button v-if="!playerStore.starterAlchemyClaimed && playerStore.dungeonHighestFloor > 0" @click="playerStore.claimStarterAlchemy()">领取首通丹方和药材</n-button>
      <p v-else-if="!playerStore.starterAlchemyClaimed">简单秘境第 1 层首通可得聚灵丹方、灵精草 ×2、云雾花 ×1。</p>
      <!-- 材料需求 -->
      <template v-if="selectedRecipe">
        <n-divider>材料需求</n-divider>
        <n-list>
          <n-list-item v-for="material in selectedRecipe.materials" :key="material.herb">
            <n-space justify="space-between">
              <n-space>
                <span>{{ getHerbName(material.herb) }}</span>
                <small v-if="playerStore.countHerbs(material.herb) < material.count">{{ sourceNames(material.herb).join('、') }}</small>
                <n-tag size="small">需要数量: <NumericValue :value="material.count" /></n-tag>
              </n-space>
              <n-tag
                :type="playerStore.countHerbs(material.herb) >= material.count ? 'success' : 'warning'"
              >
                拥有: {{ getMaterialStatus(material) }}
              </n-tag>
            </n-space>
          </n-list-item>
        </n-list>
      </template>
      <!-- 效果预览 -->
      <template v-if="selectedRecipe">
        <n-divider>效果预览</n-divider>
        <n-descriptions bordered :column="2">
          <n-descriptions-item label="丹药介绍">
            {{ selectedRecipe.description }}
          </n-descriptions-item>
          <n-descriptions-item label="效果数值">+<NumericValue :value="((currentEffect?.value ?? 0) * 100).toFixed(1)" />%</n-descriptions-item>
          <n-descriptions-item label="持续时间"><NumericValue :value="Math.floor((currentEffect?.duration ?? 0) / 60)" />分钟</n-descriptions-item>
          <n-descriptions-item label="成功率"><NumericValue :value="(craftChance(selectedRecipe, playerStore.luck * playerStore.alchemyRate) * 100).toFixed(1)" />%</n-descriptions-item>
        </n-descriptions>
      </template>
      <!-- 炼制按钮 -->
      <n-button
        class="craft-button"
        type="primary"
        block
        v-if="selectedRecipe"
        :disabled="!selectedRecipe || !checkMaterials(selectedRecipe)"
        @click="craftPill"
      >
        {{ !checkMaterials(selectedRecipe) ? '材料不足' : '炼制并服用' }}
      </n-button>
    </n-space>
    <log-panel v-if="selectedRecipe" ref="logRef" title="炼丹日志" />
    <template v-if="storedPills.length">
      <n-divider>尚未服用</n-divider>
      <n-space><n-button v-for="pill in storedPills" :key="pill.id" @click="consume(pill)">服用{{ pill.name }}</n-button></n-space>
    </template>
    </n-tab-pane>
    <n-tab-pane name="formulas" tab="丹方">
      <h3>已掌握 · {{ unlockedRecipes.length }}</h3>
      <p v-if="!unlockedRecipes.length">尚未掌握丹方。简单秘境首通第 1 层可得聚灵丹方。</p>
      <article v-for="r in unlockedRecipes" :key="r.id" class="formula-row">
        <div><strong>{{ r.name }}</strong><small>{{ r.description }}</small></div>
        <n-button size="small" @click="selectRecipe(r); selectTab('craft')">去炼制</n-button>
      </article>
      <template v-if="unknownRecipes.length">
        <h3>收集残页</h3>
        <p v-if="researchTarget">探索所得残页优先用于{{ researchTarget.name }}。药材来自{{ researchSources }}。</p>
        <article v-for="r in unknownRecipes" :key="r.id" class="formula-row">
          <div><strong>{{ r.name }}</strong><small>{{ r.description }}</small></div>
          <span>残页 {{ playerStore.pillFragments[r.id] ?? 0 }} / {{ r.fragmentsNeeded }}</span>
          <n-button size="small" :type="r.id === playerStore.researchRecipe ? 'primary' : 'default'"
            :aria-pressed="r.id === playerStore.researchRecipe" @click="toggleResearch(r.id)">
            {{ r.id === playerStore.researchRecipe ? '取消研习' : '研习' }}
          </n-button>
        </article>
      </template>
    </n-tab-pane>
    <n-tab-pane name="herbs" tab="药材">
      <n-list v-if="playerStore.herbs.length">
        <n-list-item v-for="herb in playerStore.herbs" :key="herb.id + ':' + herb.quality">
          <strong>{{ herb.name }} ×{{ herb.count ?? 1 }}</strong> · {{ herbQualities[herb.quality as keyof typeof herbQualities]?.name ?? herb.quality }}
          <div>{{ herb.description }}</div>
        </n-list-item>
      </n-list>
      <n-empty v-else description="尚未采得药材"><template #extra><router-link to="/exploration">去探索</router-link></template></n-empty>
    </n-tab-pane>
    </n-tabs>
  </n-card>
</template>

<script setup lang="ts">
  import NumericValue from '../components/NumericValue.vue'

  import { ref, computed, watch } from 'vue'
  import { usePlayerStore } from '../stores/player'
  import { craftChance, pillRecipes, pillGrades, pillTypes, calculatePillEffect } from '../plugins/pills'
  import type { PillRecipe, RecipeMaterial } from '../plugins/pills'
  import { herbName as getHerbName, herbQualities } from '../plugins/herbs'
  import { useRoute, useRouter } from 'vue-router'
  import { useMessage } from 'naive-ui'
  import type { Pill } from '../types/game'
  import { locations } from '../plugins/locations'
  import { getRealmName } from '../plugins/realm'
  import LogPanel from '../components/LogPanel.vue'

  const sourceNames = (id: string) => locations.filter(place => place.herbIds.includes(id)).map(place =>
    place.name + (playerStore.level < place.minLevel ? '（' + getRealmName(place.minLevel).name + '）' : ''))

  const playerStore = usePlayerStore()
  const route = useRoute(), router = useRouter()
  const message = useMessage()
  const activeTab = computed(() => {
    const tab = route.query.tab
    return tab === 'formulas' || tab === 'herbs' ? tab : 'craft'
  })
  const selectTab = (tab: string) => router.replace({ path: '/alchemy', query: tab === 'craft' ? {} : { tab } })
  const toggleResearch = (id: string) => {
    playerStore.researchRecipe = playerStore.researchRecipe === id ? '' : id
    void playerStore.saveData()
  }
  const storedPills = computed(() => playerStore.items.filter((item): item is Pill => item.type === 'pill'))
  const consume = (pill: Pill) => {
    const result = playerStore.usePill(pill)
    if (result.success) message.success('已服用' + pill.name)
    else message.error(result.message)
  }
  const logRef = ref<InstanceType<typeof LogPanel> | null>(null)

  // 当前选择的丹方
  const selectedRecipe = ref<PillRecipe | null>(null)

  // 已解锁的丹方列表
  const unlockedRecipes = computed(() => {
    return pillRecipes.filter(recipe => playerStore.pillRecipes.includes(recipe.id))
  })

  watch(unlockedRecipes, recipes => {
    if (!recipes.some(r => r.id === selectedRecipe.value?.id)) selectedRecipe.value = recipes[0] ?? null
  }, { immediate: true })
  const unknownRecipes = computed(() => pillRecipes.filter(r => !playerStore.pillRecipes.includes(r.id)))
  const researchTarget = computed(() => unknownRecipes.value.find(r => r.id === playerStore.researchRecipe))
  const researchSources = computed(() => [...new Set(researchTarget.value?.materials.flatMap(m => sourceNames(m.herb)))].join('、'))

  // 选择丹方
  const selectRecipe = (recipe: PillRecipe) => {
    selectedRecipe.value = recipe
  }

  // 检查材料是否充足
  const checkMaterials = (recipe: PillRecipe | null) => {
    if (!recipe) return false
    return recipe.materials.every(material => {
      const count = playerStore.countHerbs(material.herb)
      return count >= material.count
    })
  }

  // 获取材料状态文本
  const getMaterialStatus = (material: RecipeMaterial) => {
    const count = playerStore.countHerbs(material.herb)
    return `${count}/${material.count}`
  }


  // 计算当前效果
  const currentEffect = computed(() => {
    if (!selectedRecipe.value) return null
    return calculatePillEffect(selectedRecipe.value, playerStore.level)
  })

  // 炼制丹药
  const craftPill = () => {
    if (!selectedRecipe.value) return
    const result = playerStore.craftPill(selectedRecipe.value.id)
    if (result.success) {
      const text = selectedRecipe.value.name + '已炼成并服用，药效已生效。'
      message.success(text)
      logRef.value?.addLog('success', text)
      // 播放成功动画效果
      const btn = document.querySelector('.craft-button')
      if (btn) {
        btn.classList.add('success-animation')
        setTimeout(() => {
          btn.classList.remove('success-animation')
        }, 1000)
      }
    } else {
      logRef.value?.addLog('error', `炼制失败：${result.message}`)
      // 播放失败动画效果
      const btn = document.querySelector('.craft-button')
      if (btn) {
        btn.classList.add('fail-animation')
        setTimeout(() => {
          btn.classList.remove('fail-animation')
        }, 1000)
      }
    }
  }
</script>

<style scoped>
  .formula-row { display:flex; align-items:center; flex-wrap:wrap; gap:8px 16px; border-bottom:1px solid var(--line); padding:10px 0; }
  .formula-row > div { flex:1 1 200px; }
  .formula-row small { display:block; color:var(--muted); }
  .formula-row .n-button { margin:0; }
  .n-space {
    width: 100%;
  }

  .n-button {
    margin-bottom: 12px;
  }

  .n-collapse {
    margin-top: 12px;
  }

  .craft-button {
    position: relative;
    overflow: hidden;
  }

  @keyframes success-ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes fail-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-10px);
    }
    75% {
      transform: translateX(10px);
    }
  }

  .success-animation::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: rgba(0, 255, 0, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: success-ripple 1s ease-out;
  }

  .fail-animation {
    animation: fail-shake 0.5s ease-in-out;
  }
</style>
