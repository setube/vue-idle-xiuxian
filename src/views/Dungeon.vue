<template>
  <div class="dungeon-container">
    <n-card title="秘境探索">
      <template #header-extra>
        <n-space>
          <n-select
            v-model:value="playerStore.dungeonDifficulty"
            @update:value="handleUpdateValue"
            placeholder="请选择难度"
            :options="dungeonOptions"
            style="width: 120px"
            :disabled="dungeonState.inCombat || dungeonState.showingOptions"
          />
          <n-button
            type="primary"
            :class="{ 'guide-target': !playerStore.isNewPlayer && playerStore.journeyStage === 'trial' && !dungeonState.inCombat && !dungeonState.showingOptions && playerStore.dungeonDifficulty === 1 }"
            @click="resumeOrStart"
            :disabled="dungeonState.inCombat || dungeonState.showingOptions"
          >
            {{ pausedFloor ? '继续第 ' + pausedFloor + ' 层' : '从第 1 层开始' }}
          </n-button>
          <n-button v-if="floorData && !pausedFloor && !dungeonState.inCombat && !dungeonState.showingOptions" @click="startRecord">挑战第 {{ floorData + 1 }} 层</n-button>
          <n-button v-if="pausedFloor || dungeonState.inCombat || dungeonState.showingOptions" @click="restart">从第 1 层重新探索</n-button>
        </n-space>
      </template>
      <div class="dungeon-body">
        <DungeonIdlePanel />
        <n-alert v-if="!dungeonState.inCombat && !dungeonState.showingOptions && lastBattle" :type="lastBattle.won ? 'success' : 'warning'" :title="'第 ' + lastBattle.floor + ' 层 · ' + (lastBattle.won ? '胜利' : '战败')" class="battle-report">
          <p>{{ lastBattle.result }}</p>
          <p>{{ lastBattle.settlement }}</p>
          <p v-if="comparison" class="battle-comparison">{{ comparison }}</p>
          <n-button v-if="canRetry" size="small" @click="$router.push('/character')">去角色调整装备</n-button>
        </n-alert>
        <p v-if="!dungeonState.inCombat" class="risk-note">{{ riskText }}</p>
        <!-- 层数显示 -->
        <span v-if="!dungeonState.inCombat && !dungeonState.showingOptions">本难度最高通关 {{ floorData }} 层</span>
        <!-- 选项界面 -->
        <section v-if="draft.length">
          <div v-for="group in draft" :key="group.floor">
            <h3>第 {{ group.floor }} 层增益</h3>
            <div class="option-cards">
              <button v-for="option in group.options" :key="option.id" type="button" class="option-card"
                :class="{ kept: group.selected === option.id }" :aria-pressed="group.selected === option.id" @click="group.selected = option.id">
                <strong>{{ option.name }}</strong><p>{{ option.description }}</p>
              </button>
            </div>
          </div>
          <n-button type="primary" :disabled="draft.some(g => !g.selected)" @click="enterRecord">进入第 {{ dungeonState.floor }} 层</n-button>
        </section>
        <n-card v-else-if="dungeonState.showingOptions" :title="'第 ' + dungeonState.floor + ' 层 · 选择增益'">
          <template #header-extra>
            <n-space>
              <n-button type="primary" @click="handleRefreshOptions" :disabled="refreshNumber === 0">
                刷新增益(<NumericValue :value="refreshNumber" />)
              </n-button>
            </n-space>
          </template>
          <div class="option-cards">
            <div
              v-for="option in dungeonState.currentOptions"
              :key="option.id"
              class="option-card"
              :style="{ borderColor: getOptionColor(option.type).color }"
              :class="{ kept: keptOption === option.id }"
            >
              <button type="button" class="choose-option" :aria-label="'选用' + option.name" @click="selectOption(option)">
                <span class="option-name">{{ option.name }}</span>
              <span class="option-description">{{ option.description }}</span>
              <small>{{ optionPreviews[option.id] }}</small>
              <span class="option-quality" :style="{ color: getOptionColor(option.type).color }">
                {{ getOptionColor(option.type).name }}
              </span>
              </button>
              <n-button v-if="refreshNumber > 0" size="small" :aria-pressed="keptOption === option.id"
                @click="keptOption = keptOption === option.id ? '' : option.id">
                {{ keptOption === option.id ? '取消保留' : '刷新时保留' }}
              </n-button>
            </div>
          </div>
        </n-card>
        <!-- 战斗界面 -->
        <section v-else-if="dungeonState.inCombat && dungeonState.combatManager" class="battle-live" aria-label="当前战斗">
          <h3>第 {{ dungeonState.floor }} 层 · 第 {{ dungeonState.combatManager.round }} / {{ dungeonState.combatManager.maxRounds }} 回合</h3>
          <div class="combat-scene">
            <div v-for="side in battleSides" :key="side" class="fighter" :class="side">
              <div class="fighter-heading">
                <n-button text @click="openFighterDetails(side)">{{ dungeonState.combatManager[side].name }}</n-button>
                <span>气血 {{ Math.ceil(dungeonState.combatManager[side].currentHealth) }} / {{ Math.ceil(dungeonState.combatManager[side].stats.maxHealth) }}</span>
              </div>
              <progress :aria-label="dungeonState.combatManager[side].name + '气血'" :value="dungeonState.combatManager[side].currentHealth" :max="dungeonState.combatManager[side].stats.maxHealth" />
              <img :key="dungeonState.combatManager[side].currentHealth" class="combat-art"
                :class="{ hit: dungeonState.combatManager[side].currentHealth < dungeonState.combatManager[side].stats.maxHealth }"
                :src="side === 'player' ? '/art/swordsman.svg' : creatureArt(dungeonState.combatManager.enemy.name)" :alt="dungeonState.combatManager[side].name" />
            </div>
          </div>
          <details v-if="dungeonState.combatManager.log.length" class="combat-events">
            <summary>战斗记录 · {{ dungeonState.combatManager.log.at(-1) }}</summary>
            <ol><li v-for="(entry, i) in dungeonState.combatManager.log" :key="i">{{ entry }}</li></ol>
          </details>
            <n-modal
              v-model:show="infoShow"
              preset="dialog"
              :title="`${
                infoType == 'player' ? dungeonState.combatManager.player.name : dungeonState.combatManager.enemy.name
              }的属性`"
            >
              <n-card :bordered="false">
                <!-- 玩家属性 -->
                <template v-if="infoType == 'player'">
                  <n-divider>基础属性</n-divider>
                  <n-descriptions bordered :column="2">
                    <n-descriptions-item label="生命值">
                      <NumericValue :value="dungeonState.combatManager.player.currentHealth.toFixed(1)" /> /
                      <NumericValue :value="dungeonState.combatManager.player.stats.maxHealth.toFixed(1)" />
                    </n-descriptions-item>
                    <n-descriptions-item label="攻击力">
                      <NumericValue :value="dungeonState.combatManager.player.stats.damage.toFixed(1)" />
                    </n-descriptions-item>
                    <n-descriptions-item label="防御力">
                      <NumericValue :value="dungeonState.combatManager.player.stats.defense.toFixed(1)" />
                    </n-descriptions-item>
                    <n-descriptions-item label="速度">
                      <NumericValue :value="dungeonState.combatManager.player.stats.speed.toFixed(1)" />
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-divider>战斗属性</n-divider>
                  <n-descriptions bordered :column="3">
                    <n-descriptions-item label="暴击率">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.critRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="连击率">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.comboRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="反击率">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.counterRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="眩晕率">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.stunRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="闪避率">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.dodgeRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="吸血率">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.vampireRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-divider>战斗抗性</n-divider>
                  <n-descriptions bordered :column="3">
                    <n-descriptions-item label="抗暴击">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.critResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗连击">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.comboResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗反击">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.counterResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗眩晕">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.stunResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗闪避">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.dodgeResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗吸血">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.vampireResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-divider>特殊属性</n-divider>
                  <n-descriptions bordered :column="4">
                    <n-descriptions-item label="强化治疗">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.healBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="强化爆伤">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.critDamageBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="弱化爆伤">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.critDamageReduce * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="最终增伤">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.finalDamageBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="最终减伤">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.finalDamageReduce * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="战斗属性提升">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.combatBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="战斗抗性提升">
                      <NumericValue :value="(dungeonState.combatManager.player.stats.resistanceBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                  </n-descriptions>
                </template>
                <!-- 敌人属性 -->
                <template v-else>
                  <n-divider>基础属性</n-divider>
                  <n-descriptions bordered :column="2">
                    <n-descriptions-item label="生命值">
                      <NumericValue :value="dungeonState.combatManager.enemy.currentHealth.toFixed(1)" /> /
                      <NumericValue :value="dungeonState.combatManager.enemy.stats.maxHealth.toFixed(1)" />
                    </n-descriptions-item>
                    <n-descriptions-item label="攻击力">
                      <NumericValue :value="dungeonState.combatManager.enemy.stats.damage.toFixed(1)" />
                    </n-descriptions-item>
                    <n-descriptions-item label="防御力">
                      <NumericValue :value="dungeonState.combatManager.enemy.stats.defense.toFixed(1)" />
                    </n-descriptions-item>
                    <n-descriptions-item label="速度">
                      <NumericValue :value="dungeonState.combatManager.enemy.stats.speed.toFixed(1)" />
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-divider>战斗属性</n-divider>
                  <n-descriptions bordered :column="3">
                    <n-descriptions-item label="暴击率">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.critRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="连击率">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.comboRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="反击率">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.counterRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="眩晕率">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.stunRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="闪避率">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.dodgeRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="吸血率">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.vampireRate * 100).toFixed(1)" />%
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-divider>战斗抗性</n-divider>
                  <n-descriptions bordered :column="3">
                    <n-descriptions-item label="抗暴击">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.critResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗连击">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.comboResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗反击">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.counterResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗眩晕">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.stunResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗闪避">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.dodgeResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="抗吸血">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.vampireResist * 100).toFixed(1)" />%
                    </n-descriptions-item>
                  </n-descriptions>
                  <n-divider>特殊属性</n-divider>
                  <n-descriptions bordered :column="3">
                    <n-descriptions-item label="强化治疗">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.healBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="强化爆伤">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.critDamageBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="弱化爆伤">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.critDamageReduce * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="最终增伤">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.finalDamageBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="最终减伤">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.finalDamageReduce * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="战斗属性提升">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.combatBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                    <n-descriptions-item label="战斗抗性提升">
                      <NumericValue :value="(dungeonState.combatManager.enemy.stats.resistanceBoost * 100).toFixed(1)" />%
                    </n-descriptions-item>
                  </n-descriptions>
                </template>
              </n-card>
            </n-modal>
        </section>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts">
  import type { DungeonOption as RunOption } from '../plugins/dungeon'
  interface DraftGroup { floor: number; options: RunOption[]; selected: string }
  interface PausedRun {
    floor: number; buffs: RunOption[]; options: RunOption[]; draft: DraftGroup[]; refreshes: number; kept: string
  }
  const pausedRuns = new Map<number, PausedRun>()
</script>
<script setup lang="ts">
  import { creatureArt } from '../plugins/illustrations'
  import { dungeonNames } from '../plugins/dungeon-idle'
  import DungeonIdlePanel from '../components/DungeonIdlePanel.vue'
  import NumericValue from '../components/NumericValue.vue'

  import { ref, watch, onMounted, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import type { DungeonOption, DungeonOptionQuality } from '../plugins/dungeon'
  import { usePlayerStore } from '../stores/player'
  import { formatStatValue, getStatName } from '../plugins/stats'
  import { getRealmName } from '../plugins/realm'
  import { describeBattle, compareBattles, highestFloorKey, recordBattle } from '../plugins/battle-report'
  import { petTrait } from '../plugins/pet-growth'
  import { CombatManager, CombatEntity, generateEnemy, CombatType } from '../plugins/combat'
  import { getRandomOptions } from '../plugins/dungeon'
  import { useMessage } from 'naive-ui'
  import { useGameNotices } from '../plugins/game-notices'

  const playerStore = usePlayerStore()
  const notify = useGameNotices()
  const message = useMessage()
  const battleSides = ['player', 'enemy'] as const
  const infoShow = ref(false)
  const infoType = ref<'player' | 'enemy' | ''>('')

  const floorKey = computed(() => highestFloorKey(playerStore.dungeonDifficulty))
  const floorData = computed(() => playerStore[floorKey.value])

  // 副本状态
  const dungeonState = ref<{floor:number; inCombat:boolean; showingOptions:boolean; currentOptions:DungeonOption[]; combatManager:CombatManager|null}>({
    floor: floorData.value,
    inCombat: false,
    showingOptions: false,
    currentOptions: [],
    combatManager: null
  })

  watch(() => dungeonState.value.inCombat || dungeonState.value.showingOptions,
    active => playerStore.setDungeonChallenge(active), { flush: 'sync' })
  const reports = computed(() => playerStore.dungeonReports.filter(report => report.difficulty === playerStore.dungeonDifficulty))
  const lastBattle = computed(() => reports.value[0])
  const comparison = computed(() => compareBattles(lastBattle.value, reports.value[1]))
  const canRetry = computed(() => !dungeonState.value.inCombat && !dungeonState.value.showingOptions &&
    !!lastBattle.value && !lastBattle.value.won && lastBattle.value.floor === floorData.value + 1)
  const buffs = ref<DungeonOption[]>([])
  const draft = ref<DraftGroup[]>([])
  const pausedFloor = ref(0)
  const route = useRoute()
  const router = useRouter()

  const protectedFloor = (floor: number) => playerStore.dungeonDifficulty === 1 && floor <= 3
  const riskText = computed(() => {
    const floor = dungeonState.value.showingOptions ? dungeonState.value.floor : pausedFloor.value || 1
    if (protectedFloor(floor)) return '入门试炼 · 简单前 3 层战败保留全部修为。'
    return playerStore.dungeonDifficulty === 100 ? '战败会清空当前修为，并跌落 1～3 重境界。' : '战败会损失当前修为的 10%～50%。'
  })

  const saveReport = (combat: CombatManager, won: boolean, settlement: string) => {
    const enemyRemaining = Math.ceil(100 * Math.min(1, Math.max(0, combat.enemy.currentHealth / combat.enemy.stats.maxHealth)))
    playerStore.dungeonReports = recordBattle(playerStore.dungeonReports, {
      difficulty: playerStore.dungeonDifficulty, floor: dungeonState.value.floor, won,
      rounds: Math.min(combat.round, combat.maxRounds), enemyRemaining, result: describeBattle(combat), settlement
    })
    void playerStore.saveData()
  }

  let mounted = true
  let animationTimer: ReturnType<typeof setTimeout> | undefined
  const optionColors: Record<DungeonOptionQuality, { name: string; color: string }> = { epic: { name: '史诗', color: '#e91e63' }, rare: { name: '稀有', color: '#2196f3' }, common: { name: '普通', color: '#4caf50' } }

  // 根据选项类型获取颜色
  const getOptionColor = (type: DungeonOptionQuality | undefined) => {
    return optionColors[type ?? 'common']
  }

  // 创建玩家战斗实体
  const createPlayerEntity = () => {
    // 基础属性
    const baseStats = {
      health: playerStore.effectiveBaseAttributes.health,
      damage: playerStore.effectiveBaseAttributes.attack,
      defense: playerStore.effectiveBaseAttributes.defense,
      speed: playerStore.effectiveBaseAttributes.speed,
      // 战斗属性
      critRate: playerStore.effectiveCombatAttributes.critRate,
      comboRate: playerStore.effectiveCombatAttributes.comboRate,
      counterRate: playerStore.effectiveCombatAttributes.counterRate,
      stunRate: playerStore.effectiveCombatAttributes.stunRate,
      dodgeRate: playerStore.effectiveCombatAttributes.dodgeRate,
      vampireRate: playerStore.effectiveCombatAttributes.vampireRate,
      // 战斗抗性
      critResist: playerStore.effectiveCombatResistance.critResist,
      comboResist: playerStore.effectiveCombatResistance.comboResist,
      counterResist: playerStore.effectiveCombatResistance.counterResist,
      stunResist: playerStore.effectiveCombatResistance.stunResist,
      dodgeResist: playerStore.effectiveCombatResistance.dodgeResist,
      vampireResist: playerStore.effectiveCombatResistance.vampireResist,
      // 特殊属性
      healBoost: playerStore.effectiveSpecialAttributes.healBoost,
      critDamageBoost: playerStore.effectiveSpecialAttributes.critDamageBoost,
      critDamageReduce: playerStore.effectiveSpecialAttributes.critDamageReduce,
      finalDamageBoost: playerStore.effectiveSpecialAttributes.finalDamageBoost,
      finalDamageReduce: playerStore.effectiveSpecialAttributes.finalDamageReduce,
      combatBoost: playerStore.effectiveSpecialAttributes.combatBoost,
      resistanceBoost: playerStore.effectiveSpecialAttributes.resistanceBoost,
      // 其他属性
      spiritDamage: playerStore.spirit * 0.1,
      maxHealth: playerStore.effectiveBaseAttributes.health
      , autoHeal: playerStore.effectBonuses.autoHeal
    }
    const entity = new CombatEntity(playerStore.name, playerStore.level, baseStats, playerStore.realm)
    // 应用所有激活的增益效果
    const activeBuffs = buffs.value
    activeBuffs.forEach(buff => {
      if (typeof buff.effect === 'function') {
        buff.effect(entity)
      }
    })
    entity.currentHealth = entity.stats.maxHealth
    return entity
  }

  const optionPreviews = computed(() => Object.fromEntries(dungeonState.value.currentOptions.map(option => {
    const entity = createPlayerEntity()
    const before = { ...entity.stats }
    option.effect(entity)
    const changes = (Object.keys(before) as (keyof typeof before)[]).flatMap(stat => {
      const a = before[stat], b = entity.stats[stat]
      if (a === b || stat === 'health') return []
      const key = stat === 'maxHealth' ? 'health' : stat === 'damage' ? 'attack' : stat
      return [getStatName(key) + ' ' + formatStatValue(key, a) + ' → ' + formatStatValue(key, b)]
    })
    return [option.id, changes.join(' · ')]
  })))

  // 开始新的副本
  const startDungeon = () => {
    if (dungeonState.value.inCombat || dungeonState.value.showingOptions) return
    buffs.value = []
    dungeonState.value = {
      floor: 0,
      inCombat: false,
      showingOptions: false,
      currentOptions: [],
      combatManager: null
    }
    playerStore.dungeonTotalRuns++ // 增加总探索次数
    nextFloor()
  }

  const restart = () => {
    pausedRuns.delete(playerStore.dungeonDifficulty)
    pausedFloor.value = 0
    draft.value = []
    infoShow.value = false
    dungeonState.value.inCombat = dungeonState.value.showingOptions = false
    startDungeon()
  }
  const startRecord = () => {
    if (!floorData.value || dungeonState.value.inCombat || dungeonState.value.showingOptions) return
    buffs.value = []
    const floor = floorData.value + 1
    dungeonState.value = { floor, inCombat: false, showingOptions: true, currentOptions: [], combatManager: null }
    const floors = [1]
    for (let n = 5; n <= floor; n += 5) floors.push(n)
    draft.value = floors.map(n => ({ floor: n, options: getRandomOptions(n), selected: '' }))
    playerStore.dungeonTotalRuns++
  }
  const enterRecord = () => {
    if (!draft.value.length || draft.value.some(g => !g.selected)) return
    buffs.value = draft.value.map(g => g.options.find(o => o.id === g.selected)!)
    draft.value = []
    dungeonState.value.showingOptions = false
    startCombat()
  }
  const resumeOrStart = () => {
    if (!pausedFloor.value) return startDungeon()
    dungeonState.value.floor = pausedFloor.value
    pausedFloor.value = 0
    startCombat()
  }
  const restoreRun = () => {
    const run = pausedRuns.get(playerStore.dungeonDifficulty)
    buffs.value = run?.buffs ?? []
    draft.value = run?.draft ?? []
    const options = run?.options ?? []
    const choosing = !!(options.length || draft.value.length)
    dungeonState.value = { floor: run?.floor ?? 0, showingOptions: choosing, currentOptions: options, inCombat: false, combatManager: null }
    pausedFloor.value = run && !choosing ? run.floor : 0
    refreshNumber.value = run?.refreshes ?? 0
    keptOption.value = run?.kept ?? ''
  }
  const rememberRun = () => {
    if (!pausedFloor.value && !dungeonState.value.inCombat && !dungeonState.value.showingOptions) return
    pausedRuns.set(playerStore.dungeonDifficulty, { floor: pausedFloor.value || dungeonState.value.floor,
      buffs: buffs.value, options: dungeonState.value.showingOptions ? dungeonState.value.currentOptions : [],
      draft: draft.value, refreshes: refreshNumber.value, kept: keptOption.value })
  }

  // 进入下一层
  const nextFloor = () => {
    dungeonState.value = {
      ...dungeonState.value,
      floor: dungeonState.value.floor + 1
    }
    const floor = dungeonState.value.floor
    // 检查是否需要显示选项
    if (floor === 1 || floor % 5 === 0) {
      const randRefres = Math.floor(Math.random() * 3) + 1
      message.success(`获得了${randRefres}刷新次数`)
      refreshNumber.value = randRefres
      keptOption.value = ''
      showOptions()
      return
    }
    startCombat()
  }

  // 显示随机选项
  const showOptions = () => {
    dungeonState.value.showingOptions = true
    dungeonState.value.currentOptions = getRandomOptions(dungeonState.value.floor)
  }

  // 选择选项
  const selectOption = (option: DungeonOption) => {
    if (!dungeonState.value.showingOptions) return
    keptOption.value = ''
    buffs.value.push(option)
    message.success(`选择了：${option.name}`)
    dungeonState.value.showingOptions = false
    dungeonState.value.currentOptions = []
    startCombat()
  }

  // 处理失败
  const handleDefeat = (combat: CombatManager) => {
    let settlement: string
    dungeonState.value.inCombat = false
    infoShow.value = false
    infoType.value = ''
    playerStore.dungeonDeathCount++
    // 清除所有临时增益效果
    buffs.value = []
    pausedRuns.delete(playerStore.dungeonDifficulty)
    // 记录失败层数
    playerStore.dungeonLastFailedFloor = dungeonState.value.floor
    // 随机跌落境界或修为
    if (protectedFloor(dungeonState.value.floor)) {
      settlement = '入门试炼保护，本场保留全部修为。'
    } else if (playerStore.dungeonDifficulty !== 100) {
      // 损失一定修为值作为惩罚
      const cultivationLossRate = Math.random() * 0.4 + 0.1 // 随机10%到50%
      const cultivationLoss = Math.floor(playerStore.cultivation * cultivationLossRate)
      playerStore.cultivation = Math.max(0, playerStore.cultivation - cultivationLoss)
      settlement = cultivationLoss ? `本场损失 ${cultivationLoss} 修为。` : '本场修为损失为 0。'
    } else {
      // 跌落境界作为惩罚
      const randomGradeLoss = Math.floor(Math.random() * 3) + 1 // 随机损失1-3个境界
      const playerLevel = Math.max(1, playerStore.level - randomGradeLoss) // 降低境界
      const dropped = playerStore.level - playerLevel
      playerStore.level = playerLevel
      playerStore.realm = getRealmName(playerLevel).name
      playerStore.cultivation = 0 // 移除所有灵力
      playerStore.maxCultivation = getRealmName(playerLevel).maxCultivation // 降低所需最大灵力值
      settlement = dropped ? `跌落 ${dropped} 重，当前为${playerStore.realm}。` : '已在最低境界，本场修为清零。'
    }
    saveReport(combat, false, settlement)
  }

  // 开始战斗
  const startCombat = () => {
    const floor = dungeonState.value.floor
    const isBossFloor = floor % 10 === 0
    const isEliteFloor = floor % 5 === 0
    const enemyType = isBossFloor ? CombatType.BOSS : isEliteFloor ? CombatType.ELITE : CombatType.NORMAL
    // 创建玩家战斗实体，并应用所有增益效果
    const playerEntity = createPlayerEntity()
    // 创建敌人
    const enemy = generateEnemy(floor, enemyType, playerStore.dungeonDifficulty)
    // 创建战斗管理器
    dungeonState.value.combatManager = new CombatManager(playerEntity, enemy, enemyType, petTrait(playerStore.activePet?.name ?? ''))
    const combatManager = dungeonState.value.combatManager
    dungeonState.value.inCombat = true
    combatManager.start() // 初始化战斗状态
    void autoCombat(combatManager) // 开始自动战斗
  }

  // 自动战斗
  const pause = (ms: number) => new Promise<void>(resolve => {
    animationTimer = setTimeout(() => { animationTimer = undefined; resolve() }, ms)
  })
  const autoCombat = async (combatManager: CombatManager) => {
    while (mounted && dungeonState.value.inCombat && dungeonState.value.combatManager === combatManager) {
      const result = combatManager.executeTurn()
      if (!result) break
      // 检查战斗是否结束
      if (result.state === 'victory') {
        handleVictory(combatManager)
        break
      } else if (result.state === 'defeat') {
        handleDefeat(combatManager)
        break
      }
      // 添加延迟使战斗动画更流畅
      await pause(950)
    }
  }

  // 处理胜利
  const handleVictory = (combat: CombatManager) => {
    infoShow.value = false
    const loot: string[] = []
    dungeonState.value.inCombat = false
    // 更新统计数据
    playerStore.dungeonTotalKills++
    const { stones, bonus } = playerStore.rewardDungeonMilestone(dungeonState.value.floor)
    if (stones) loot.push(`${stones} 洗练石`)
    if (bonus) loot.push(`首次通关第 5 层额外获得 ${bonus} 洗练石`)
    // 更新最高层数记录
    playerStore[floorKey.value] = Math.max(floorData.value, dungeonState.value.floor)
    // 获得奖励
    const rewards = generateRewards()
    rewards.forEach(reward => {
      playerStore.spiritStones += reward.amount
      loot.push(`${reward.amount} 灵石`)
      playerStore.dungeonTotalRewards++
    })
    const firstTrial = playerStore.dungeonDifficulty === 1 && dungeonState.value.floor === 1
    if (firstTrial && playerStore.claimStarterAlchemy()) loot.push('聚灵丹方', '灵精草 ×2', '云雾花 ×1')
    for (const reward of loot) notify('秘境奖励', reward)
    saveReport(combat, true, '获得 ' + loot.join('、') + '。')
    if (firstTrial) {
      if (playerStore.journeyStage === 'trial') playerStore.journeyStage = 'done'
      void playerStore.saveData()
    }
    if (firstTrial || (playerStore.dungeonDifficulty === 1 && dungeonState.value.floor === 3)) {
      pausedFloor.value = dungeonState.value.floor + 1
      rememberRun()
    } else nextFloor()
  }

  // 生成奖励
  const generateRewards = () => {
    const rewards = []
    // 灵石奖励
    const baseStones = 10 * dungeonState.value.floor * playerStore.dungeonDifficulty
    rewards.push({
      type: 'spirit_stones',
      amount: baseStones
    })
    return rewards
  }

  const openFighterDetails = (type: 'player' | 'enemy') => {
    infoShow.value = true
    infoType.value = type
  }

  const dungeonOptions = Object.entries(dungeonNames).map(([value, label]) => ({ value: Number(value), label }))

  const handleUpdateValue = (value: number) => {
    restoreRun()
    if (value === 100) {
      message.warning('警告! 通天难度挑战失败后会跌落境界')
    }
  }
  const refreshNumber = ref(3)
  const keptOption = ref('')
  // 刷新选择
  const handleRefreshOptions = () => {
    if (refreshNumber.value <= 0 || !dungeonState.value.showingOptions) return
    dungeonState.value.currentOptions = getRandomOptions(dungeonState.value.floor, dungeonState.value.currentOptions, keptOption.value)
    refreshNumber.value--
  }
  onMounted(async () => {
    if (!playerStore.dungeonTotalRuns) pausedRuns.clear()
    restoreRun()
    if (route.query.trial === '1') {
      const ready = playerStore.dungeonDifficulty === 1 && floorData.value === 0
      await router.replace({ path: '/dungeon' })
      if (mounted && ready) startDungeon()
      return
    }
    const { retryFloor, difficulty } = route.query
    if (retryFloor === undefined) return
    const matches = canRetry.value && String(lastBattle.value?.floor) === retryFloor &&
      String(playerStore.dungeonDifficulty) === difficulty
    await router.replace({ path: '/dungeon' })
    if (mounted && matches && canRetry.value) {
      if (floorData.value) startRecord()
      else startDungeon()
    }
  })

  onUnmounted(() => {
    mounted = false
    playerStore.setDungeonChallenge(false)
    rememberRun()
    if (animationTimer) clearTimeout(animationTimer)
    dungeonState.value.inCombat = false
  })
</script>

<style scoped>
  .combat-art { display:block; width:100%; height:116px; object-fit:contain; margin:4px auto 0; }
  @media(prefers-reduced-motion:no-preference) { .combat-art.hit {animation:boar-hit .22s ease-out;} }
  @keyframes boar-hit { 35% {transform:translateX(4px) rotate(1deg);} }
  .battle-comparison { margin: 6px 0; font-weight: 600; }
  .dungeon-container {
    margin: 0 auto;
  }

  .option-cards {
    display: flex;
    gap: 16px;
    padding: 16px;
    margin: 0 auto;
  }

  .option-card {
    position: relative;
    padding: 20px;
    border: 2px solid;
    border-radius: 12px;
    background: var(--n-color);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    min-height: 100px;
    width: 33%;
  }

  .option-card:hover {
    transform: translateY(-1px);
    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.1);
  }

  .choose-option { display: flex; flex: 1; flex-direction: column; gap: 6px; text-align: left; border: 0; padding: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .option-card > .n-button { align-self: flex-start; margin-top: 12px; }
  .option-card.kept { outline: 2px solid currentColor; outline-offset: 2px; }

  .option-name {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 12px;
    padding-right: 80px;
  }

  .option-description {
    flex-grow: 1;
    font-size: 1em;
    color: var(--n-text-color);
    line-height: 1.6;
    margin-bottom: 8px;
  }

  .option-quality {
    position: absolute;
    top: 20px;
    right: 20px;
    font-size: 0.9em;
    font-weight: bold;
    padding: 4px 12px;
    border-radius: 20px;
    background: var(--n-color);
  }

  .dungeon-body { display: grid; gap: 12px; }
  .dungeon-body p { margin: 4px 0; }
  .battle-live { padding: 12px 0; }
  .battle-live h3 { margin: 0 0 12px; font-size: 16px; }
  .combat-scene { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .fighter { padding: 12px 16px; border: 1px solid var(--n-border-color); border-radius: 6px; }
  .fighter-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .fighter-heading button { font-weight: 600; }
  .fighter-heading span { font-variant-numeric: tabular-nums; }
  .fighter progress { display: block; width: 100%; height: 8px; margin-top: 10px; accent-color: #23916d; }
  .enemy progress { accent-color: #bd5350; }
  .combat-events { margin-top: 14px; }
  .combat-events summary { cursor: pointer; }
  .combat-events ol { max-height: 10rem; overflow-y: auto; }
</style>
