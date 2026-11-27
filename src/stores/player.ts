import { canIdleAt, MAX_OFFLINE_SECONDS, newDungeonIdle, settleDungeonIdle } from '../plugins/dungeon-idle'
import { investedEssence, setPetGrowth, starResult, transferPlan, upgradeCost } from '../plugins/pet-growth'
import { defineStore } from 'pinia'
import { herbs as herbDefinitions } from '../plugins/herbs'
import { STARTER_RECIPE_ID, mergePillEffects, pillRecipes, tryCreatePill, calculatePillEffect } from '../plugins/pills'
import { decryptData, encryptData, validateData } from '../plugins/crypto'
import { DATA_SYNC_INTERVALS_SECONDS, DEFAULT_DATA_SYNC_INTERVAL_SECONDS } from '../types/player'
import type { DataSyncIntervalSeconds, PlayerState, ActionResult } from '../types/player'
import type { Equipment, EquipmentSlot, GameItem, Herb, Pet, Pill, Stats } from '../types/game'
import { assert, assertFiniteNumber } from '../utils/assert'
import { normalizePlayerData } from './save'
import { claimFirstReforgeReward, focusCost, focusPreview } from '../plugins/equipment'
import { applyEquipmentChanges, equipmentDifferences } from '../plugins/equipment-stats'
import { isPet, petRoster, splitEssence, projectedChanges, battlePoints, type ReleaseQuote } from '../plugins/companion-ranking'
import { stonePrices } from '../plugins/equipment-prices'
import {
  createPlayerSaveSerializer,
  getPlayerSaveStatus,
  isValidPlayerSave,
  persistPlayerImmediately,
  PLAYER_SAVE_KEY,
  playerSaveStorage,
  readPersistedPlayerSave,
  readPersistedPlayerState,
  reschedulePlayerPersistence,
  registerPlayerPersistenceStore,
  schedulePlayerPersistence
} from './player-persistence'
import { deleteLegacyPlayerDatabase, LEGACY_PLAYER_MIGRATION_KEY, readLegacyPlayerSave } from './legacy-save'
import { getBaseCultivationGain, getCultivationCost, getCultivationPlan } from '../utils/cultivation'
import { foundationGear, foundationLevel } from '../plugins/foundation-reward'
import { realmGrowth, getRealmName, getRealmLength } from '../plugins/realm'

// Input state is local to the open page and must never survive a reload.
export const useCultivationInput = defineStore('cultivation-input', {
  state: () => ({ manualPress: false })
})

export { MAX_OFFLINE_SECONDS }
export const useDungeonActivity = defineStore('dungeon-activity', {
  state: () => ({ challenging: false })
})

export const createInitialState = (): PlayerState => ({
    // 是否新玩家
    isNewPlayer: true,
    // GM模式开关
    isGMMode: false,
    // 主题设置
    isDarkMode: typeof localStorage !== 'undefined' && localStorage.getItem('darkMode') === 'true',
    // 玩家数据同步间隔，默认5秒
    dataSyncIntervalSeconds: DEFAULT_DATA_SYNC_INTERVAL_SECONDS,
    lastSpiritTickAt: 0,
    autoCultivationEnabled: false,
    journeyStage: 'village',
    autoExploreLocation: '',
    explorationFirst: true,
    // 灵宠系统
    activePet: null, // 当前出战的灵宠
    petEssence: 0, // 灵宠精华
    petConfig: {
      rarityMap: {
        divine: { name: '神品', color: '#FF0000', probability: 0.02, essenceBonus: 50 },
        celestial: { name: '仙品', color: '#FFD700', probability: 0.08, essenceBonus: 30 },
        mystic: { name: '玄品', color: '#9932CC', probability: 0.15, essenceBonus: 20 },
        spiritual: { name: '灵品', color: '#1E90FF', probability: 0.25, essenceBonus: 10 },
        mortal: { name: '凡品', color: '#32CD32', probability: 0.5, essenceBonus: 5 }
      }
    },
    // 基础属性
    name: '无名修士',
    nameChangeCount: 0, // 道号修改次数
    level: 1, // 境界等级
    realm: '练气期一层', // 当前境界名称
    cultivation: 0, // 当前修为值
    maxCultivation: getRealmName(1).maxCultivation,
    spirit: 0, // 灵力值
    spiritRate: 1, // 灵力获取倍率
    luck: 1, // 幸运值
    cultivationRate: 1, // 修炼速率
    herbRate: 1, // 灵草获取倍率
    alchemyRate: 1, // 炼丹成功率加成
    // 丹药系统
    pills: [], // 丹药库存
    pillFragments: {}, // 丹方残页（key为丹方ID，value为数量）
    starterAlchemyClaimed: false,
    researchRecipe: '',
    pillRecipes: [], // 已获得的完整丹方
    activeEffects: [], // 当前生效的丹药效果列表
    pillsCrafted: 0, // 炼制丹药次数
    pillsConsumed: 0, // 服用丹药次数
    // 基础战斗属性
    baseAttributes: {
      attack: 10, // 攻击
      health: 100, // 生命
      defense: 5, // 防御
      speed: 10 // 速度
    },
    // 战斗属性
    combatAttributes: {
      critRate: 0, // 暴击率
      comboRate: 0, // 连击率
      counterRate: 0, // 反击率
      stunRate: 0, // 眩晕率
      dodgeRate: 0, // 闪避率
      vampireRate: 0 // 吸血率
    },
    // 战斗抗性
    combatResistance: {
      critResist: 0, // 抗暴击
      comboResist: 0, // 抗连击
      counterResist: 0, // 抗反击
      stunResist: 0, // 抗眩晕
      dodgeResist: 0, // 抗闪避
      vampireResist: 0 // 抗吸血
    },
    // 特殊属性
    specialAttributes: {
      healBoost: 0, // 强化治疗
      critDamageBoost: 0, // 强化爆伤
      critDamageReduce: 0, // 弱化爆伤
      finalDamageBoost: 0, // 最终增伤
      finalDamageReduce: 0, // 最终减伤
      combatBoost: 0, // 战斗属性提升
      resistanceBoost: 0 // 战斗抗性提升
    },
    // 资源
    spiritStones: 0, // 灵石数量
    reinforceStones: 0, // 强化石数量
    refinementStones: 0, // 洗练石数量
    foundationRewardClaimed: false,
    firstReforgeRewardClaimed: false,
    herbs: [], // 灵草库存
    items: [], // 物品库存
    artifacts: [], // 法宝装备
    // 装备栏位
    equippedArtifacts: {
      weapon: null, // 武器
      head: null, // 头部
      body: null, // 衣服
      feet: null, // 鞋子
      wrist: null, // 护腕
      necklace: null, // 项链
      ring: null, // 戒指
      artifact: null // 法宝
    },
    // 装备加成属性
    artifactBonuses: {
      // 基础属性加成
      attack: 0,
      health: 0,
      defense: 0,
      speed: 0,
      // 战斗属性加成
      critRate: 0,
      comboRate: 0,
      counterRate: 0,
      stunRate: 0,
      dodgeRate: 0,
      vampireRate: 0,
      // 抗性加成
      critResist: 0,
      comboResist: 0,
      counterResist: 0,
      stunResist: 0,
      dodgeResist: 0,
      vampireResist: 0,
      // 特殊属性加成
      healBoost: 0,
      critDamageBoost: 0,
      critDamageReduce: 0,
      finalDamageBoost: 0,
      finalDamageReduce: 0,
      combatBoost: 0,
      resistanceBoost: 0,
      // 修炼相关加成
      cultivationRate: 1,
      spiritRate: 1
    },
    // 统计数据
    totalCultivationTime: 0, // 总修炼时间
    breakthroughCount: 0, // 突破次数
    explorationCount: 0, // 探索次数
    locationVisits: {},
    itemsFound: 0, // 获得物品数量
    eventTriggered: 0, // 触发事件次数
    unlockedPillRecipes: 0, // 解锁丹方数量
    // 秘境相关数据
    dungeonIdle: newDungeonIdle(),
    dungeonReports: [],
    dungeonDifficulty: 1, // 难度选择
    dungeonHighestFloor: 0, // 最高通关层数
    dungeonHighestFloor_2: 0, // 最高通关层数
    dungeonHighestFloor_5: 0, // 最高通关层数
    dungeonHighestFloor_10: 0, // 最高通关层数
    dungeonHighestFloor_100: 0, // 最高通关层数
    dungeonLastFailedFloor: 0, // 最后失败层数
    dungeonTotalRuns: 0, // 总探索次数
    dungeonBossKills: 0, // Boss击杀数
    dungeonEliteKills: 0, // 精英击杀数
    dungeonTotalKills: 0, // 总击杀数
    dungeonDeathCount: 0, // 死亡次数
    dungeonTotalRewards: 0, // 获得奖励次数
    // 自动出售相关设置
    autoSellQualities: [], // 选中的装备品质
    autoReleaseRarities: [], // 选中的灵宠品质
    // 心愿单相关设置
    wishlistEnabled: false, // 心愿单开关
    selectedWishEquipQuality: null,
    selectedWishPetRarity: null,
    // 成就与解锁项
    unlockedRealms: ['练气一层'], // 已解锁境界
    unlockedLocations: ['新手村'], // 已解锁地点
    unlockedSkills: [], // 已解锁功法
    completedAchievements: [] // 已完成成就
})

export const usePlayerStore = defineStore('player', {
  persist: {
    key: PLAYER_SAVE_KEY,
    storage: playerSaveStorage,
    serializer: createPlayerSaveSerializer(createInitialState),
    pick: Object.keys(createInitialState()),
    afterHydrate: ({ store }) => registerPlayerPersistenceStore(store as unknown as Parameters<typeof registerPlayerPersistenceStore>[0])
  },
  state: createInitialState,
  getters: {
    effectBonuses(): Stats {
      const bonuses: Stats = {}
      const now = Date.now()
      for (const effect of this.activeEffects) {
        if (effect.endTime > now) bonuses[effect.type] = (bonuses[effect.type] ?? 0) + effect.value
      }
      return bonuses
    },
    effectiveSpiritRate(): number {
      const effects = this.effectBonuses
      return this.spiritRate * this.artifactBonuses.spiritRate * (1 + (effects.spiritRate ?? 0) + (effects.spiritRecovery ?? 0) + (effects.allAttributes ?? 0))
    },
    effectiveCultivationRate(): number {
      const effects = this.effectBonuses
      return this.cultivationRate * this.artifactBonuses.cultivationRate * (1 + (effects.cultivationRate ?? 0) + (effects.cultivationEfficiency ?? 0) + (effects.comprehension ?? 0) + (effects.allAttributes ?? 0))
    },
    cultivationPlan(): ReturnType<typeof getCultivationPlan> {
      return getCultivationPlan(this.level, this.maxCultivation - this.cultivation, this.effectiveCultivationRate)
    },
    effectiveSpiritCap(): number {
      // A full realm's cultivation always fits; a capacity pill adds room to stockpile.
      const cost = getCultivationCost(this.level)
      const gain = getBaseCultivationGain(this.level)
      const trainingCapacity = this.level <= 6 ? Math.max(this.maxCultivation, 100 * this.level) : this.maxCultivation
      const needed = cost * Math.ceil(trainingCapacity / gain)
      return Math.min(Number.MAX_VALUE, Math.max(100, needed) * (1 + (this.effectBonuses.spiritCap ?? 0)))
    },
    effectiveBaseAttributes(): Stats {
      const all = 1 + (this.effectBonuses.allAttributes ?? 0)
      const growth: Stats = realmGrowth(this.level, this.cultivation / Math.max(1, this.maxCultivation))
      return Object.fromEntries(Object.entries(this.baseAttributes).map(([key, value]) => [key, (value + (growth[key] ?? 0)) * all * (key === 'attack' ? 1 + (this.effectBonuses.fireAttribute ?? 0) : 1)]))
    },
    effectiveCombatAttributes(): Stats {
      const multiplier = 1 + (this.effectBonuses.allAttributes ?? 0)
      return Object.fromEntries(Object.entries(this.combatAttributes).map(([key, value]) => [key, Math.min(1, value * multiplier)]))
    },
    effectiveCombatResistance(): Stats {
      const multiplier = 1 + (this.effectBonuses.allAttributes ?? 0)
      return Object.fromEntries(Object.entries(this.combatResistance).map(([key, value]) => [key, Math.min(1, value * multiplier)]))
    },
    effectiveSpecialAttributes(): Stats {
      const result = { ...this.specialAttributes }
      result.combatBoost += this.effectBonuses.combatBoost ?? 0
      return result
    },
    canClaimFoundationGear(): boolean {
      return !this.foundationRewardClaimed &&
        (this.level >= foundationLevel || this.unlockedRealms.includes(getRealmName(foundationLevel).name))
    },
    combatPower(): number {
      return battlePoints({
        ...this.effectiveBaseAttributes,
        ...this.effectiveCombatAttributes,
        ...this.effectiveCombatResistance,
        ...this.effectiveSpecialAttributes
      }, 2)
    },
    // 获取灵宠的属性加成
    getPetBonus(): Stats {
      if (!this.activePet)
        return {
          attack: 0,
          defense: 0,
          health: 0,
          critRate: 0,
          comboRate: 0,
          counterRate: 0,
          stunRate: 0,
          dodgeRate: 0,
          vampireRate: 0,
          critResist: 0,
          comboResist: 0,
          counterResist: 0,
          stunResist: 0,
          dodgeResist: 0,
          vampireResist: 0,
          healBoost: 0,
          critDamageBoost: 0,
          critDamageReduce: 0,
          finalDamageBoost: 0,
          finalDamageReduce: 0,
          combatBoost: 0,
          resistanceBoost: 0
        }
      const qualityBonusMap: Stats = {
        divine: 0.15, // 神品基础加成15%
        celestial: 0.12, // 仙品基础加成12%
        mystic: 0.09, // 玄品基础加成9%
        spiritual: 0.06, // 灵品基础加成6%
        mortal: 0.03 // 凡品基础加成3%
      }
      const starBonusPerQuality: Stats = {
        divine: 0.02, // 神品每星+2%
        celestial: 0.01, // 仙品每星+1%
        mystic: 0.01, // 玄品每星+1%
        spiritual: 0.01, // 灵品每星+1%
        mortal: 0.01 // 凡品每星+1%
      }
      const baseBonus = qualityBonusMap[this.activePet.rarity] || 0
      const starBonus = (this.activePet.star || 0) * (starBonusPerQuality[this.activePet.rarity] || 0)
      const levelBonus = ((this.activePet.level || 1) - 1) * (baseBonus * 0.1)
      const totalBonus = baseBonus + starBonus + levelBonus
      const phase = Math.floor((this.activePet.star || 0) / 5)
      const phaseBonus = phase * (baseBonus * 0.5)
      const finalBonus = totalBonus + phaseBonus
      const combatBonus = finalBonus * 0.5
      return {
        attack: finalBonus,
        defense: finalBonus,
        health: finalBonus,
        critRate: combatBonus,
        comboRate: combatBonus,
        counterRate: combatBonus,
        stunRate: combatBonus,
        dodgeRate: combatBonus,
        vampireRate: combatBonus,
        critResist: combatBonus,
        comboResist: combatBonus,
        counterResist: combatBonus,
        stunResist: combatBonus,
        dodgeResist: combatBonus,
        vampireResist: combatBonus,
        healBoost: combatBonus,
        critDamageBoost: combatBonus,
        critDamageReduce: combatBonus,
        finalDamageBoost: combatBonus,
        finalDamageReduce: combatBonus,
        combatBoost: combatBonus,
        resistanceBoost: combatBonus
      }
    }
  },
  actions: {
    tickDungeonIdle(now = Date.now(), returning = false) {
      settleDungeonIdle(this.$state, now, !returning && useDungeonActivity().challenging, returning)
    },
    setDungeonChallenge(challenging: boolean, now = Date.now()) {
      const activity = useDungeonActivity()
      if (challenging === activity.challenging) return
      this.tickDungeonIdle(now)
      activity.challenging = challenging
    },
    setIdleFloor(difficulty: number, floor: number, now = Date.now()) {
      if (floor !== 0 && !canIdleAt(this.$state, difficulty, floor)) return false
      this.tickDungeonIdle(now)
      if (floor) this.dungeonIdle.difficulty = difficulty
      this.dungeonIdle.floor = floor
      this.dungeonIdle.at = Math.max(this.dungeonIdle.at, now)
      void this.saveData()
      return true
    },
    focusEquipment(target: Equipment, stat: string): ActionResult {
      const worn = this.equippedArtifacts[target.type]
      const item = worn?.id === target.id ? worn : this.items.find((i): i is Equipment => i.type === target.type && i.id === target.id)
      const preview = item && focusPreview(this, item, stat)
      if (!item || !preview || preview.after <= preview.before) return { success: false, message: '该属性当前无法继续提升' }
      if (this.refinementStones < focusCost) return { success: false, message: '洗练石不足' }
      this.refinementStones -= focusCost
      item.stats[stat] = preview.after
      if (worn?.id === item.id) applyEquipmentChanges(this, { [stat]: preview.after - preview.before })
      void this.saveData()
      return { success: true, message: '定向洗练成功' }
    },
    rewardDungeonMilestone(floor: number) {
      if (floor < 1 || floor % 5 !== 0) return { stones: 0, bonus: 0 }
      const boss = floor % 10 === 0
      const stones = (boss ? 5 : 2) * this.dungeonDifficulty
      this.refinementStones += stones
      if (boss) this.dungeonBossKills++
      else this.dungeonEliteKills++
      const bonus = floor === 5 ? claimFirstReforgeReward(this) : 0
      return { stones, bonus }
    },
    /** Pinia hydrates selected encrypted state synchronously; legacy IndexedDB is read exactly once when needed. */
    async initializePlayer(): Promise<number> {
      let offlineGain = 0
      registerPlayerPersistenceStore(this)
      try {
        const persistedSave = readPersistedPlayerSave()
        const migrationComplete = localStorage.getItem(LEGACY_PLAYER_MIGRATION_KEY) === 'true'
        if (persistedSave !== null) {
          const persisted = readPersistedPlayerState()
          assert(persisted && isValidPlayerSave(persisted), '新版存档无效，旧版存档保留')
          this.$patch(persisted)
          this.expireEffects()
          if (!migrationComplete) {
            const deleted = await deleteLegacyPlayerDatabase()
            assert(deleted, '旧版存档仍被其他页面占用，迁移标记未写入')
            localStorage.setItem(LEGACY_PLAYER_MIGRATION_KEY, 'true')
          }
        } else if (!migrationComplete) {
          const legacy = await readLegacyPlayerSave()
          if (legacy !== null) {
            const decoded = decryptData(legacy)
            assert(validateData(decoded), '旧版存档无效，迁移未执行')
            const restored = normalizePlayerData(decoded, createInitialState())
            this.$patch(restored)
            this.expireEffects()
            await this.flushData()
            const saved = readPersistedPlayerState()
            assert(saved && isValidPlayerSave(saved), '新版存档验证失败，旧版存档保留')
          }
          // Keep the old database and retry on the next start if another tab blocks deletion.
          const deleted = await deleteLegacyPlayerDatabase()
          assert(deleted, '旧版存档仍被其他页面占用，迁移标记未写入')
          localStorage.setItem(LEGACY_PLAYER_MIGRATION_KEY, 'true')
        }
        const now = Date.now()
        offlineGain = this.recoverOfflineSpirit(now)
        this.tickDungeonIdle(now, true)
        if (offlineGain > 0 || this.dungeonIdle.floor) await this.flushData()
      } catch (error) {
        console.error('加载存档失败:', error)
      }
      this.isDarkMode = localStorage.getItem('darkMode') === 'true'
      this.updateHtmlDarkMode(this.isDarkMode)
      return offlineGain
    },
    // 更新HTML暗黑模式类
    updateHtmlDarkMode(isDarkMode: boolean) {
      if (typeof document === 'undefined') return
      const htmlEl = document.documentElement
      if (isDarkMode) {
        htmlEl.classList.add('dark')
      } else {
        htmlEl.classList.remove('dark')
      }
    },
    // 切换暗黑模式
    toggle() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('darkMode', String(this.isDarkMode))
      // 更新html标签的class
      this.updateHtmlDarkMode(this.isDarkMode)
      this.saveData()
    },
    // Coalesce frequent game ticks; timers and promises never become save data.
    saveData(): Promise<void> {
      return schedulePlayerPersistence(this)
    },
    setDataSyncInterval(seconds: number): void {
      assert(DATA_SYNC_INTERVALS_SECONDS.includes(seconds as DataSyncIntervalSeconds), '数据同步间隔无效')
      this.dataSyncIntervalSeconds = seconds as DataSyncIntervalSeconds
      // Keep the pending batch but align its deadline to the newly selected interval.
      reschedulePlayerPersistence(this)
    },
    async flushData(): Promise<void> {
      await persistPlayerImmediately(this)
      const status = getPlayerSaveStatus(this)
      assert(!status.pending, '存档仍在等待写入')
      assert(!status.writeError, '玩家存档写入失败')
    },
    async exportData(): Promise<string> {
      this.expireEffects()
      await this.flushData()
      const data = readPersistedPlayerSave()
      assert(data, '没有可导出的存档')
      return data
    },
    async importData(encryptedData: string): Promise<void> {
      const decoded = decryptData(encryptedData)
      assert(validateData(decoded), '存档数据验证失败，原有存档未修改')
      const restored = normalizePlayerData(decoded, createInitialState())
      assert(encryptData(restored), '存档加密失败')
      await this.flushData()
      this.$reset()
      this.$patch(restored)
      this.lastSpiritTickAt = Date.now()
      if (this.dungeonIdle.floor) this.dungeonIdle.at = this.lastSpiritTickAt
      this.expireEffects()
      this.updateHtmlDarkMode(this.isDarkMode)
      await persistPlayerImmediately(this)
    },
    async clearData(): Promise<void> {
      await this.flushData()
      this.$reset()
      await persistPlayerImmediately(this)
    },
    recoverOfflineSpirit(now = Date.now()): number {
      const previous = this.lastSpiritTickAt
      this.lastSpiritTickAt = now
      if (previous <= 0 || previous >= now) return 0
      const seconds = Math.min(MAX_OFFLINE_SECONDS, Math.floor((now - previous) / 1000))
      const room = Math.max(0, this.effectiveSpiritCap - this.spirit)
      const gained = Math.min(room, seconds * this.spiritRate * this.artifactBonuses.spiritRate)
      this.spirit += gained
      return gained
    },
    // 获取灵力
    gainSpirit(amount: number) {
      assertFiniteNumber(amount, '灵力收益')
      this.expireEffects()
      const capacity = this.effectiveSpiritCap
      if (this.spirit < capacity) this.spirit = Math.min(capacity, this.spirit + amount * this.effectiveSpiritRate)
      this.saveData()
    },
    // 修炼增加修为
    tickAutoCultivation(explorationReserve = 0) {
      if (!this.autoCultivationEnabled || this.level >= getRealmLength() || useCultivationInput().manualPress) return
      const { cost, gain, totalCost } = this.cultivationPlan
      if (totalCost === 0 || this.spirit - totalCost >= explorationReserve) {
        this.spirit -= totalCost
        this.cultivate(Math.max(0, this.maxCultivation - this.cultivation))
        return
      }
      if (this.spirit - cost < explorationReserve) return
      this.spirit -= cost
      this.cultivate(gain)
    },
    cultivate(amount: number) {
      this.totalCultivationTime += 1
      this.gainCultivation(amount)
      this.saveData()
    },
    gainCultivation(amount: number) {
      // 确保amount是数字类型
      const numAmount = Number(String(amount).replace(/[^0-9.-]/g, '')) || 0
      this.cultivation = Number(String(this.cultivation).replace(/[^0-9.-]/g, '')) || 0
      this.cultivation = Number((this.cultivation + numAmount).toFixed(6))
      if (this.cultivation >= this.maxCultivation) {
        if (!this.tryBreakthrough()) this.cultivation = this.maxCultivation
      }
    },
    // 尝试突破
    tryBreakthrough() {
      // 境界等级对应的境界名称和修为上限
      const realmsLength = getRealmLength()
      // 检查是否可以突破到下一个境界
      if (this.level < realmsLength) {
        const nextRealm = getRealmName(this.level + 1)
        // 更新境界信息
        this.level += 1
        this.realm = nextRealm.name // 使用完整的境界名称（如：练气一层）
        this.maxCultivation = nextRealm.maxCultivation
        this.cultivation = 0 // 重置修为值
        this.breakthroughCount += 1 // 增加突破次数
        // 解锁新境界
        if (!this.unlockedRealms.includes(nextRealm.name)) {
          this.unlockedRealms.push(nextRealm.name)
        }
        // 突破奖励
        this.spirit += 100 * this.level // 获得灵力奖励
        this.spiritRate *= 1.2 // 提升灵力获取倍率
        this.saveData()
        return true
      }
      return false
    },
    claimFoundationGear(id: Equipment['id']): boolean {
      const choice = foundationGear.find(item => item.id === id)
      if (!choice || !this.canClaimFoundationGear) return false
      this.foundationRewardClaimed = true
      this.gainItem({ ...choice, stats: { ...choice.stats } })
      return true
    },
    // 获得物品
    gainItem(item: GameItem) {
      if (item.type !== 'pet' && item.type !== 'pill') item.unread = true
      this.items.push(item)
      this.itemsFound++ // 增加获得物品统计
      this.saveData()
    },
    // 使用物品（丹药或灵宠）
    useItem(item: GameItem): ActionResult {
      if (item.type === 'pill') {
        return this.usePill(item)
      } else if (item.type === 'pet') {
        return this.usePet(item)
      }
      return { success: false, message: '无法使用该物品' }
    },
    quoteEquipmentSale(items: Equipment[]) {
      return {
        ids: items.map(item => item.id),
        total: items.reduce((sum, item) => sum + (stonePrices.get(item.quality) ?? NaN), 0),
        enhanced: items.filter(item => (item.enhanceLevel ?? 0) > 0).length
      }
    },
    confirmEquipmentSale(quote: { ids: Equipment['id'][]; total: number; enhanced: number }): ActionResult {
      const ids = new Set(quote.ids)
      const items = this.items.filter((item): item is Equipment =>
        ids.has(item.id) && item.type !== 'pill' && item.type !== 'pet')
      const current = this.quoteEquipmentSale(items)
      if (!items.length || items.length !== ids.size || current.total !== quote.total || current.enhanced !== quote.enhanced) {
        return { success: false, message: '装备清单已变化，请重新选择' }
      }
      const sold = new Set<GameItem>(items)
      this.items = this.items.filter(item => !sold.has(item))
      this.reinforceStones += current.total
      this.saveData()
      return { success: true, message: `已卖出 ${items.length} 件装备，获得 ${current.total} 个强化石` }
    },
    async sellEquipment(item: Equipment): Promise<ActionResult> {
      return this.confirmEquipmentSale(this.quoteEquipmentSale([item]))
    },
    async batchSellEquipments(quality: string | null = null, equipmentType: string | null = null): Promise<ActionResult> {
      const items = this.items.filter((item): item is Equipment => item.type !== 'pill' && item.type !== 'pet'
        && (!quality || item.quality === quality) && (!equipmentType || item.type === equipmentType))
      return this.confirmEquipmentSale(this.quoteEquipmentSale(items))
    },
    // Apply only a pill actually present in inventory, and consume exactly once.
    usePill(pill: Pill): ActionResult {
      const index = this.items.findIndex(item => item.id === pill.id && item.type === 'pill')
      if (index < 0) return { success: false, message: '丹药不存在或已服用' }
      const stored = this.items[index]
      if (stored.type !== 'pill') return { success: false, message: '无效的丹药' }
      assertFiniteNumber(stored.effect.value, '丹药效果')
      assertFiniteNumber(stored.effect.duration, '丹药持续时间', 1)
      this.items.splice(index, 1)
      this.applyPillEffect(stored.name, stored.effect)
      this.saveData()
      return { success: true, message: '使用丹药成功' }
    },
    expireEffects(now = Date.now()): void {
      this.activeEffects = this.activeEffects.filter(effect => effect.endTime > now)
    },
    applyPillEffect(name: string, effect: Pill['effect']) {
      const now = Date.now()
      this.activeEffects = mergePillEffects([...this.activeEffects, { ...effect, name, startTime: now, endTime: now + effect.duration * 1000 }], now)
      this.pillsConsumed++
    },
    gainHerb(herb: Herb, count = 1): void {
      assertFiniteNumber(count, '灵草数量', 1)
      assert(Number.isSafeInteger(count), '灵草数量必须是整数')
      const stack = this.herbs.find(item => item.id === herb.id && item.quality === herb.quality)
      if (stack) stack.count = (stack.count ?? 1) + count
      else this.herbs.push({ ...herb, count })
      this.saveData()
    },
    countHerbs(herbId?: string): number {
      return this.herbs.reduce((total, herb) => total + (!herbId || herb.id === herbId ? herb.count ?? 1 : 0), 0)
    },
    consumeHerbs(herbId: string, count: number): void {
      assertFiniteNumber(count, '消耗灵草数量', 1)
      assert(Number.isSafeInteger(count) && this.countHerbs(herbId) >= count, '灵草数量不足')
      let remaining = count
      for (const herb of this.herbs) {
        if (herb.id !== herbId || remaining === 0) continue
        const used = Math.min(herb.count ?? 1, remaining)
        herb.count = (herb.count ?? 1) - used
        remaining -= used
      }
      this.herbs = this.herbs.filter(herb => (herb.count ?? 1) > 0)
    },
    // 使用灵宠（出战/召回）
    usePet(pet: Pet): ActionResult {
      // 如果当前没有出战灵宠，直接出战新灵宠
      if (!this.activePet) {
        return this.deployPet(pet)
      }
      // 如果点击的是当前出战灵宠，则召回
      if (this.activePet.id === pet.id) {
        return this.recallPet()
      }
      // 如果点击的是其他灵宠，先召回当前灵宠，再出战新灵宠
      this.recallPet()
      return this.deployPet(pet)
    },
    // 召回灵宠
    petScore(pet: Pet): number {
      return battlePoints(projectedChanges(this, this.effectBonuses, pet.combatAttributes, this.activePet?.combatAttributes))
    },
    classifyPets() {
      const pets = this.items.filter(isPet)
      const scores = new Map(pets.map(p => [p.id, this.petScore(p)]))
      return petRoster(pets, this.activePet?.id, p => scores.get(p.id)!)
    },
    petEssenceYield(pet: Pet) {
      return splitEssence(this.petConfig.rarityMap[pet.rarity]?.essenceBonus ?? 0)
    },
    quotePetRelease(pets: Pet[]): ReleaseQuote {
      return { ids: pets.map(p => p.id), essence: pets.reduce((sum, pet) => sum + this.petEssenceYield(pet).release, 0) }
    },
    receiveDrawnPet(pet: Pet) {
      this.petEssence += this.petEssenceYield(pet).draw
      this.items.push(pet)
    },
    releasePets(quote: ReleaseQuote, surplusOnly = true): ActionResult {
      const ids = new Set(quote.ids)
      const pets = this.items.filter(isPet).filter(p => ids.has(p.id))
      const protectedSet = surplusOnly ? this.classifyPets().surplus : null
      if (!pets.length || pets.length !== quote.ids.length || ids.size !== pets.length ||
          pets.some(p => p.id === this.activePet?.id || (protectedSet && !protectedSet.has(p.id))) ||
          this.quotePetRelease(pets).essence !== quote.essence) return { success: false, message: '灵宠清单已变化，请重新选择。' }
      this.items = this.items.filter(item => !isPet(item) || !ids.has(item.id))
      this.petEssence += quote.essence
      void this.saveData()
      return { success: true, message: `放生 ${pets.length} 只，获得 ${quote.essence} 灵宠精华。` }
    },
    recallPet() {
      if (!this.activePet) {
        return { success: false, message: '当前没有出战的灵宠' }
      }
      // 重置所有属性加成
      this.resetPetBonuses()
      this.activePet = null
      this.saveData()
      return { success: true, message: '召回成功' }
    },
    // 出战灵宠
    deployPet(pet: Pet): ActionResult {
      // 如果已有灵宠出战，先召回
      if (this.activePet) {
        this.recallPet()
      }
      // 出战新灵宠
      this.activePet = pet
      // 应用灵宠属性加成
      this.applyPetBonuses()
      this.saveData()
      return { success: true, message: '出战成功' }
    },
    // 重置灵宠属性加成
    resetPetBonuses() {
      if (!this.activePet) return
      const petBonus = this.activePet.combatAttributes
      // 保存原始属性值
      const originalBaseAttributes = { ...this.baseAttributes }
      const originalCombatAttributes = { ...this.combatAttributes }
      const originalCombatResistance = { ...this.combatResistance }
      const originalSpecialAttributes = { ...this.specialAttributes }
      // 更新基础属性
      this.baseAttributes.attack = originalBaseAttributes.attack - (petBonus.attack ?? 0)
      this.baseAttributes.defense = originalBaseAttributes.defense - (petBonus.defense ?? 0)
      this.baseAttributes.health = originalBaseAttributes.health - (petBonus.health ?? 0)
      this.baseAttributes.speed = originalBaseAttributes.speed - (petBonus.speed ?? 0)
      // 更新战斗属性
      Object.keys(this.combatAttributes).forEach(key => {
        this.combatAttributes[key] = originalCombatAttributes[key] - (petBonus[key] || 0)
      })
      // 更新战斗抗性
      Object.keys(this.combatResistance).forEach(key => {
        this.combatResistance[key] = originalCombatResistance[key] - (petBonus[key] || 0)
      })
      // 更新特殊属性
      Object.keys(this.specialAttributes).forEach(key => {
        this.specialAttributes[key] = originalSpecialAttributes[key] - (petBonus[key] || 0)
      })
    },
    // 应用灵宠属性加成
    applyPetBonuses() {
      if (!this.activePet) return
      const petBonus = this.activePet.combatAttributes
      // 保存原始属性值
      const originalBaseAttributes = { ...this.baseAttributes }
      const originalCombatAttributes = { ...this.combatAttributes }
      const originalCombatResistance = { ...this.combatResistance }
      const originalSpecialAttributes = { ...this.specialAttributes }
      // 更新基础属性
      this.baseAttributes.attack = originalBaseAttributes.attack + (petBonus.attack ?? 0)
      this.baseAttributes.defense = originalBaseAttributes.defense + (petBonus.defense ?? 0)
      this.baseAttributes.health = originalBaseAttributes.health + (petBonus.health ?? 0)
      this.baseAttributes.speed = originalBaseAttributes.speed + (petBonus.speed ?? 0)
      // 更新战斗属性
      Object.keys(this.combatAttributes).forEach(key => {
        this.combatAttributes[key] = originalCombatAttributes[key] + (petBonus[key] || 0)
      })
      // 更新战斗抗性
      Object.keys(this.combatResistance).forEach(key => {
        this.combatResistance[key] = originalCombatResistance[key] + (petBonus[key] || 0)
      })
      // 更新特殊属性
      Object.keys(this.specialAttributes).forEach(key => {
        this.specialAttributes[key] = originalSpecialAttributes[key] + (petBonus[key] || 0)
      })
    },
    bestQualityCandidates(): Equipment[] {
      const qualities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
      const upgrades = new Map<EquipmentSlot, Equipment>()
      for (const item of this.items) {
        if (item.type === 'pill' || item.type === 'pet' || (item.requiredRealm ?? 0) > this.level) continue
        const current = upgrades.get(item.type) ?? this.equippedArtifacts[item.type]
        const rank = qualities.indexOf(item.quality)
        const oldRank = current ? qualities.indexOf(current.quality) : -1
        const differences = current && rank === oldRank ? Object.values(equipmentDifferences(item.stats, current.stats)) : []
        if (rank > oldRank || (differences.length > 0 && differences.every(delta => delta > 0))) {
          upgrades.set(item.type, item)
        }
      }
      return [...upgrades.values()]
    },
    equipBestQuality(): number {
      let changed = 0
      for (const item of this.bestQualityCandidates()) {
        if (this.equipArtifact(item, item.type).success) changed++
      }
      let clearedUnread = false
      for (const item of this.items) {
        if (item.type !== 'pet' && item.type !== 'pill' && item.unread) {
          delete item.unread
          clearedUnread = true
        }
      }
      if (clearedUnread) this.saveData()
      return changed
    },
    // 穿上装备
    equipArtifact(artifact: Equipment, slot: EquipmentSlot): ActionResult {
      // 检查境界要求
      if (artifact.requiredRealm && this.level < artifact.requiredRealm) {
        return { success: false, message: '境界不足，无法装备此装备' }
      }
      // 先卸下当前装备
      if (this.equippedArtifacts[slot]) {
        this.unequipArtifact(slot)
      }
      // 从背包中移除装备
      const index = this.items.findIndex(item => item.id === artifact.id)
      if (index !== -1) {
        this.items.splice(index, 1)
      }
      // 穿上新装备
      delete artifact.unread
      this.equippedArtifacts[slot] = artifact
      applyEquipmentChanges(this, artifact.stats)
      this.saveData()
      return { success: true, message: '装备成功' }
    },
    // 卸下装备
    unequipArtifact(slot: EquipmentSlot): boolean {
      const artifact = this.equippedArtifacts[slot]
      if (artifact) {
        applyEquipmentChanges(this, equipmentDifferences({}, artifact.stats))
        // 将装备返回到背包
        this.items.push(artifact)
        this.equippedArtifacts[slot] = null
        this.saveData()
        return true
      }
      return false
    },
    // 获取装备总加成
    getArtifactBonus(type: string): number {
      return this.artifactBonuses[type] || 1
    },
    learnRecipe(id: string) {
      if (!this.pillRecipes.includes(id)) {
        this.pillRecipes.push(id)
        this.unlockedPillRecipes++
      }
      delete this.pillFragments[id]
      if (this.researchRecipe === id) this.researchRecipe = ''
    },
    claimStarterAlchemy(): boolean {
      if (this.starterAlchemyClaimed || this.dungeonHighestFloor < 1) return false
      const recipe = pillRecipes.find(entry => entry.id === STARTER_RECIPE_ID)!
      this.starterAlchemyClaimed = true
      this.learnRecipe(recipe.id)
      for (const material of recipe.materials) {
        const herb = herbDefinitions.find(entry => entry.id === material.herb)!
        this.gainHerb({ ...herb, quality: 'common', value: herb.baseValue }, material.count)
      }
      void this.saveData()
      return true
    },
    // 获得丹方残页
    gainPillFragment(recipeId: string) {
      if (this.pillRecipes.includes(recipeId)) return
      if (!this.pillFragments[recipeId]) {
        this.pillFragments[recipeId] = 0
      }
      this.pillFragments[recipeId]++
      // 检查是否可以合成完整丹方
      const recipe = pillRecipes.find(r => r.id === recipeId)
      if (recipe && this.pillFragments[recipeId] >= recipe.fragmentsNeeded) {
        this.learnRecipe(recipeId)
      }
      this.saveData()
    },
    // 炼制丹药
    craftPill(recipeId: string): ActionResult {
      const recipe = pillRecipes.find(r => r.id === recipeId)
      if (!recipe || !this.pillRecipes.includes(recipeId)) {
        return { success: false, message: '未掌握丹方' }
      }
      const fragments = this.pillFragments[recipeId] || 0
      const result = tryCreatePill(recipe, this.herbs, this, fragments, this.luck * this.alchemyRate)
      if (result.success) {
        for (const material of recipe.materials) this.consumeHerbs(material.herb, material.count)
        this.applyPillEffect(recipe.name, calculatePillEffect(recipe, this.level))
        this.pillsCrafted++
        this.saveData()
      }
      return result
    },
    // 获取当前有效的丹药效果
    getActiveEffects() {
      const now = Date.now()
      return this.activeEffects.filter(effect => effect.endTime > now)
    },
    // 添加装备到背包
    addEquipment(equipment: Equipment) {
      if (!this.items) {
        this.items = []
      }
      equipment.unread = true
      this.items.push(equipment)
      this.saveData()
    },
    ownedPet(id: Pet['id']) {
      return this.items.find((item): item is Pet => isPet(item) && item.id === id)
    },
    growPet(pet: Pet, level: number, star: number) {
      const deployed = this.activePet?.id === pet.id
      if (deployed) this.resetPetBonuses()
      setPetGrowth(pet, level, star)
      if (deployed) {
        this.activePet = pet
        this.applyPetBonuses()
      }
    },
    upgradePet(target: Pet): ActionResult {
      const pet = this.ownedPet(target.id)
      if (!pet) return { success: false, message: '灵宠不存在' }
      const cost = upgradeCost(pet)
      if (this.petEssence < cost) return { success: false, message: '灵宠精华不足' }
      this.petEssence -= cost
      this.growPet(pet, pet.level + 1, pet.star)
      void this.saveData()
      return { success: true, message: '升级成功' }
    },
    transferPetTraining(sourceId: Pet['id'], targetId: Pet['id']): ActionResult {
      const source = this.ownedPet(sourceId), target = this.ownedPet(targetId)
      if (!source || !target || source.id === target.id || source.level <= 1)
        return { success: false, message: '请选择另一只已升级的灵宠' }
      const plan = transferPlan(source, target)
      this.growPet(source, 1, source.star)
      this.growPet(target, plan.level, target.star)
      this.petEssence += plan.remainder
      void this.saveData()
      return { success: true, message: target.name + '已继承修为，达到 ' + plan.level + ' 级' }
    },
    evolvePet(target: Pet, material: Pet): ActionResult {
      const pet = this.ownedPet(target.id), food = this.ownedPet(material.id)
      if (!pet || !food || food.id === pet.id || food.id === this.activePet?.id || food.rarity !== pet.rarity)
        return { success: false, message: '请选择同品质且未出战的材料灵宠' }
      const next = starResult(pet, food)
      const advanced = next.star > pet.star
      this.items = this.items.filter(item => item.id !== food.id)
      this.petEssence += investedEssence(food.level)
      if (advanced) this.growPet(pet, pet.level, next.star)
      pet.starProgress = next.progress
      if (this.activePet?.id === pet.id) this.activePet = pet
      void this.saveData()
      return { success: true, message: advanced ? pet.name + '升至 ' + pet.star + ' 星' : '已增加升星进度' }
    }
  }
})
