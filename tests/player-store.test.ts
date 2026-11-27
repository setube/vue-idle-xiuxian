import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import persistedState from 'pinia-plugin-persistedstate'
import { decryptData, encryptData, validateData } from '../src/plugins/crypto'
import { checkAchievements } from '../src/plugins/achievements'
import { handleReward } from '../src/plugins/events'
import { normalizePlayerData } from '../src/stores/save'
import { CombatEntity, CombatManager, CombatState, generateEnemy } from '../src/plugins/combat'
import { foundationGear } from '../src/plugins/foundation-reward'
import { getRealmLength } from '../src/plugins/realm'
import { pillRecipes } from '../src/plugins/pills'
import {
  LEGACY_PLAYER_DB_NAME,
  LEGACY_PLAYER_MIGRATION_KEY,
  readLegacyPlayerSave
} from '../src/stores/legacy-save'
import {
  getPlayerDataSyncDelayMs,
  getPlayerSaveStatus,
  readPersistedPlayerSave
} from '../src/stores/player-persistence'
import { createInitialState, usePlayerStore } from '../src/stores/player'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, String(value)) }
}

const memoryStorage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage })

async function writeLegacySave(value: string): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_PLAYER_DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('player-data')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('player-data', 'readwrite')
      transaction.objectStore('player-data').put(value, 'playerData')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

function createTestStore(withPersistence = true) {
  const pinia = createPinia()
  if (withPersistence) {
    pinia.use(persistedState)
    createApp({}).use(pinia)
  } else {
    createApp({}).use(pinia)
  }
  setActivePinia(pinia)
  return usePlayerStore()
}

describe('player persistence and pill effects', () => {
  let store: ReturnType<typeof usePlayerStore>

  beforeEach(async () => {
    memoryStorage.clear()
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase(LEGACY_PLAYER_DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
    store = createTestStore()
  })

  afterEach(async () => {
    try { await store.flushData() } catch { /* Failed migration tests intentionally use Pinia without persistence. */ }
    memoryStorage.clear()
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase(LEGACY_PLAYER_DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  })

  test('legacy equipment uses its stored quality and drops only its matching name suffix', () => {
    const old = createInitialState()
    const ring = { id: 'ring', type: 'ring' as const, name: '青云戒·仙', quality: 'epic', enhanceLevel: 6, stats: { defense: 9 } }
    old.equippedArtifacts.ring = ring
    old.artifacts = [ring]
    old.items = [ring, { ...ring, id: 'other', name: '仙云·天' }]
    const restored = normalizePlayerData(old, createInitialState())
    const expected = { ...ring, name: '青云戒', equipType: ring.type }
    expect(restored.equippedArtifacts.ring).toEqual(expected)
    expect(restored.artifacts[0]).toEqual(expected)
    expect(restored.items[0]).toEqual(expected)
    expect(restored.items[1]?.name).toBe('仙云·天')
    expect(normalizePlayerData(restored, createInitialState())).toEqual(restored)
  })

  test('first fifth floor tops up after regular loot only once across difficulties', () => {
    expect(store.rewardDungeonMilestone(5)).toEqual({ stones: 2, bonus: 8 })
    expect(store.refinementStones).toBe(10)
    store.refinementStones = 0
    store.dungeonDifficulty = 2
    expect(store.rewardDungeonMilestone(5)).toEqual({ stones: 4, bonus: 0 })
    expect(store.refinementStones).toBe(4)
    expect(store.rewardDungeonMilestone(10)).toEqual({ stones: 10, bonus: 0 })
    expect(store.dungeonBossKills).toBe(1)
    expect(store.dungeonEliteKills).toBe(2)
  })

  test('gift wealth milestones are paid once even after spending and revisiting', async () => {
    store.spiritStones = 20_000
    const earned = checkAchievements(store)
    expect(earned.filter(a => a.id.startsWith('resources_'))).toHaveLength(4)
    expect(store.spirit).toBe(8100)
    store.spiritStones = 0
    await store.flushData()
    await store.initializePlayer()
    expect(checkAchievements(store)).toEqual([])
    expect(store.spirit).toBe(8100)
  })

  test('offline spirit handles old saves, the eight-hour limit, capacity and repeated claims', async () => {
    const now = Date.now()
    expect(store.recoverOfflineSpirit(now)).toBe(0)
    store.maxCultivation = 100_000
    expect(store.recoverOfflineSpirit(now + 12 * 3600_000)).toBe(28_800)
    expect(store.recoverOfflineSpirit(now + 12 * 3600_000)).toBe(0)
    store.spirit = store.effectiveSpiritCap - 1
    expect(store.recoverOfflineSpirit(now + 13 * 3600_000)).toBe(1)
    store.spirit += 200
    expect(store.recoverOfflineSpirit(now + 14 * 3600_000)).toBe(0)
    expect(store.spirit).toBe(store.effectiveSpiritCap + 200)
    store.spirit = 0
    store.lastSpiritTickAt = Date.now() - 10_000
    await store.flushData()
    expect(await store.initializePlayer()).toBeCloseTo(10, 0)
    expect(await store.initializePlayer()).toBe(0)
  })

  test('ten first-village fragments unlock the starter recipe and preserve existing fragments', () => {
    store.pillFragments.thunder_power = 3
    handleReward({ type: 'pill_fragment', amount: 9 }, store, () => {}, 'newbie_village')
    expect(store.pillFragments.spirit_gathering).toBe(9)
    handleReward({ type: 'pill_fragment', amount: 1 }, store, () => {}, 'newbie_village')
    expect(store.pillRecipes).toContain('spirit_gathering')
    expect(store.pillFragments.thunder_power).toBe(3)
  })

  test('quick equip fills slots and picks the highest wearable quality without replacing ties', () => {
    const weapon = { id: 'old', name: '剑', type: 'weapon' as const, quality: 'rare', stats: { attack: 2 } }
    const better = { ...weapon, id: 'better', quality: 'legendary', stats: { attack: 8 } }
    const head = { ...weapon, id: 'hat', type: 'head' as const, quality: 'common', stats: {} }
    store.items.push(weapon)
    store.equipArtifact(weapon, 'weapon')
    const previousAttack = store.baseAttributes.attack
    store.items.push({ ...better, id: 'locked', quality: 'mythic', requiredRealm: store.level + 1 },
      better, { ...weapon, id: 'lesser', quality: 'epic' }, head)
    expect(store.equipBestQuality()).toBe(2)
    expect(store.equippedArtifacts.weapon?.id).toBe('better')
    expect(store.equippedArtifacts.head?.id).toBe('hat')
    expect(store.baseAttributes.attack).toBe(previousAttack + 6)
    expect(store.items.map(item => item.id).sort()).toEqual(['lesser', 'locked', 'old'])
    store.items.push({ ...better, id: 'tie' })
    expect(store.equipBestQuality()).toBe(0)
    expect(store.equippedArtifacts.weapon?.id).toBe('better')
  })

  test('quick equip clears spare equipment reminders even when nothing better is available', () => {
    const sword = { id: 'sword', name: '剑', type: 'weapon' as const, quality: 'rare', stats: { attack: 2 } }
    store.addEquipment(sword)
    store.addEquipment({ ...sword, id: 'spare', quality: 'common' })
    expect(store.equipBestQuality()).toBe(1)
    const unread = () => store.items.filter(item => item.type === 'weapon' && item.unread)
    expect(unread()).toHaveLength(0)
    store.addEquipment({ ...sword, id: 'later' })
    expect(unread()).toHaveLength(1)
    expect(store.equipBestQuality()).toBe(0)
    expect(unread()).toHaveLength(0)
  })

  test('batch sale pays the confirmed quote once and keeps later additions', () => {
    const sword = { id: 'a', name: '剑', type: 'weapon' as const, quality: 'rare', stats: {}, enhanceLevel: 4 }
    store.items.push(sword)
    const quote = store.quoteEquipmentSale([sword])
    expect(quote.total).toBe(3)
    expect(quote.enhanced).toBe(1)
    store.items.push({ ...sword, id: 'b' })
    const before = store.reinforceStones
    expect(store.confirmEquipmentSale(quote).success).toBe(true)
    expect(store.confirmEquipmentSale(quote).success).toBe(false)
    expect(store.reinforceStones).toBe(before + 3)
    expect(store.items.map(item => item.id)).toEqual(['b'])
  })

  test('automatic cultivation can spend the last available action', () => {
    store.spirit = 10
    store.tickAutoCultivation()
    expect(store.spirit).toBe(10)
    store.autoCultivationEnabled = true
    store.tickAutoCultivation()
    expect(store.spirit).toBe(0)
    expect(store.cultivation).toBe(1)
    store.tickAutoCultivation()
    expect(store.spirit).toBe(0)
    expect(store.cultivation).toBe(1)
  })

  test('automatic breakthrough can spend the exact balance with active bonuses', () => {
    store.autoCultivationEnabled = true
    store.cultivation = 15
    store.cultivationRate = 2
    store.spirit = 50
    store.tickAutoCultivation()
    expect(store.level).toBe(2)
    expect(store.cultivation).toBe(0)
    expect(store.spirit).toBe(200) // level-two reward
  })

  test('one spirit short of a breakthrough spends only one action', () => {
    store.autoCultivationEnabled = true
    store.cultivation = 15
    store.spirit = 99
    store.tickAutoCultivation()
    expect(store.level).toBe(1)
    expect(store.cultivation).toBe(16)
    expect(store.spirit).toBe(89)
  })

  test('a stocked cultivator advances at most one realm per tick and stops at the last realm', () => {
    store.spirit = 100_000
    store.autoCultivationEnabled = true
    store.tickAutoCultivation()
    expect(store.level).toBe(2)
    store.tickAutoCultivation()
    expect(store.level).toBe(3)
    store.level = getRealmLength()
    store.spirit = 1e30
    store.tickAutoCultivation()
    expect(store.spirit).toBe(1e30)
    expect(store.cultivation).toBe(0)
  })

  test('already earned cultivation breaks through with zero spirit', () => {
    store.autoCultivationEnabled = true
    store.cultivation = store.maxCultivation
    store.tickAutoCultivation()
    expect(store.level).toBe(2)
    expect(store.spirit).toBe(200)
  })

  test('fractional meditation gains accumulate and the starter spirit cap stays at 1000', () => {
    expect(store.effectiveSpiritCap).toBe(1000)
    store.cultivationRate = 1.3
    for (let i = 0; i < 10; i++) store.cultivate(store.cultivationPlan.gain)
    expect(store.cultivation).toBe(13)
  })

  test('first six unassisted realms follow the target pacing', () => {
    store.autoCultivationEnabled = true
    const durations: number[] = []
    let elapsed = 0
    for (let tick = 0; tick < 12_000 && store.level <= 6; tick++) {
      const previous = store.level
      store.gainSpirit(1)
      store.tickAutoCultivation()
      elapsed++
      if (store.level !== previous) {
        durations.push(elapsed)
        elapsed = 0
      }
    }
    expect(durations).toEqual([250, 596, 1198, 2098, 2990, 4190])
  })

  test('cultivation progress affects live stats; the breakthrough retains the completed training', () => {
    const start = store.combatPower
    store.cultivate(1)
    expect(store.effectiveBaseAttributes.attack).toBeCloseTo(10.04)
    expect(store.effectiveBaseAttributes.defense).toBeCloseTo(5.04)
    expect(store.effectiveBaseAttributes.health).toBeCloseTo(100.2)
    expect(store.combatPower - start).toBeCloseTo(0.16)
    store.cultivate(23)
    expect(store.level).toBe(1)
    store.cultivate(1)
    const trained = { ...store.effectiveBaseAttributes }
    expect(trained).toEqual({ attack: 14, defense: 8, health: 125, speed: 10 })
    store.$reset()
    store.autoCultivationEnabled = true
    store.spirit = store.cultivationPlan.totalCost
    store.tickAutoCultivation()
    expect(store.effectiveBaseAttributes).toEqual(trained)
    const saved = normalizePlayerData(store.$state, createInitialState())
    store.$patch(saved)
    expect(store.effectiveBaseAttributes).toEqual(trained)
  })

  test('breakthrough growth reaches combat with the same weapon and reverses on realm loss', () => {
    store.equipArtifact({ id: 'bamboo', type: 'weapon', name: '青竹剑', quality: 'common', stats: { attack: 12 } }, 'weapon')
    store.level = 9
    const before = { ...store.effectiveBaseAttributes }
    const power = store.combatPower
    function fight() {
      const stats = store.effectiveBaseAttributes
      const hero = new CombatEntity('修士', store.level, { ...stats, damage: stats.attack })
      const enemy = generateEnemy(2)
      const battle = new CombatManager(hero, enemy)
      battle.start()
      while (battle.state === CombatState.IN_PROGRESS) battle.executeTurn()
      return { dealt: enemy.stats.maxHealth - enemy.currentHealth, hp: hero.currentHealth }
    }
    const originalRandom = Math.random
    try {
      Math.random = () => 0.99
      const first = fight()
      store.tryBreakthrough()
      expect(store.effectiveBaseAttributes).toEqual({ ...before, attack: before.attack + 13, defense: before.defense + 9, health: before.health + 85 })
      expect(store.combatPower - power).toBeCloseTo(48)
      const second = fight()
      expect(second.dealt).toBeGreaterThan(first.dealt)
      expect(second.hp).toBeGreaterThan(first.hp)
    } finally { Math.random = originalRandom }
    store.level = 9
    expect(store.effectiveBaseAttributes).toEqual(before)
  })

  test('foundation prize is one persistent choice, including after a realm loss', () => {
    const [sword, armor] = foundationGear
    expect(store.claimFoundationGear(sword!.id)).toBe(false)
    store.level = 9
    store.tryBreakthrough()
    store.level = 9
    expect(store.claimFoundationGear('unknown')).toBe(false)
    expect(store.claimFoundationGear(sword!.id)).toBe(true)
    expect(store.claimFoundationGear(armor!.id)).toBe(false)
    expect(store.items).toHaveLength(1)
    expect(store.items[0]).toEqual({ ...sword!, unread: true })
    const state = normalizePlayerData(store.$state, createInitialState())
    expect(state.foundationRewardClaimed).toBe(true)
    expect(state.items[0].id).toBe(sword!.id)
  })

  test('a fresh automatic cultivator breaks through on second 250', () => {
    store.autoCultivationEnabled = true
    for (let second = 1; second <= 249; second++) {
      store.gainSpirit(1)
      store.tickAutoCultivation()
    }
    expect(store.level).toBe(1)
    expect(store.cultivation).toBe(24)
    store.gainSpirit(1)
    store.tickAutoCultivation()
    expect(store.level).toBe(2)
  })

  test('first-floor alchemy gift is claimed once and research pages finish the selected recipe', () => {
    expect(store.claimStarterAlchemy()).toBe(false)
    store.dungeonHighestFloor = 1
    expect(store.claimStarterAlchemy()).toBe(true)
    expect(store.claimStarterAlchemy()).toBe(false)
    expect(store.pillRecipes).toContain('spirit_gathering')
    expect(store.countHerbs('spirit_grass')).toBe(2)
    expect(store.countHerbs('cloud_flower')).toBe(1)
    store.researchRecipe = 'cultivation_boost'
    handleReward({ type: 'pill_fragment', amount: 16 }, store, () => {}, 'newbie_village')
    expect(store.pillRecipes).toContain('cultivation_boost')
    expect(store.researchRecipe).toBe('')
    expect(Object.values(store.pillFragments)).toEqual([1])
    expect(normalizePlayerData(store.$state, createInitialState()).starterAlchemyClaimed).toBe(true)
  })

  test('related pills retain the stronger effect and add the remaining time', () => {
    const first = { id: 'strong', type: 'pill' as const, name: '强', effect: {type: 'spiritRate', value: 0.5, duration: 60} }
    const second = { id: 'weak', type: 'pill' as const, name: '弱', effect: {type: 'spiritRecovery', value: 0.2, duration: 120} }
    store.items.push(first, second)
    store.usePill(first)
    const end = store.activeEffects[0].endTime
    store.usePill(second)
    expect(store.activeEffects).toHaveLength(1)
    expect(store.effectiveSpiritRate).toBe(1.5)
    expect(store.activeEffects[0].endTime).toBe(end + 120_000)
  })

  test('every recipe effect type is supported and applying a pill consumes it once', () => {
    const supported = new Set(['spiritRate', 'cultivationRate', 'combatBoost', 'allAttributes', 'spiritCap', 'autoHeal', 'spiritRecovery', 'cultivationEfficiency', 'comprehension', 'fireAttribute'])
    expect(pillRecipes.length).toBeGreaterThan(0)
    for (const recipe of pillRecipes) expect(supported.has(recipe.baseEffect.type)).toBe(true)

    const pill = { id: 'boost', name: '聚气丹', type: 'pill' as const, effect: { type: 'cultivationRate', value: 0.3, duration: 60 } }
    store.items.push(pill)
    expect(store.usePill(pill).success).toBe(true)
    expect(store.effectiveCultivationRate).toBeCloseTo(1.3)
    expect(store.items).toHaveLength(0)
    expect(store.pillsConsumed).toBe(1)
    expect(store.usePill(pill).success).toBe(false)
    expect(store.pillsConsumed).toBe(1)
  })

  test('data sync interval defaults to five seconds and can be changed and saved', async () => {
    expect(store.dataSyncIntervalSeconds).toBe(5)
    expect(getPlayerDataSyncDelayMs(store.dataSyncIntervalSeconds)).toBe(5000)
    expect(getPlayerDataSyncDelayMs(1)).toBe(1000)
    expect(getPlayerDataSyncDelayMs(30)).toBe(30000)
    expect(getPlayerDataSyncDelayMs(4)).toBe(5000)

    const originalSetTimeout = globalThis.setTimeout
    const scheduledDelays: number[] = []
    globalThis.setTimeout = ((handler: TimerHandler, delay?: number) => {
      scheduledDelays.push(Number(delay ?? 0))
      return originalSetTimeout(handler as (...args: never[]) => void, delay)
    }) as unknown as typeof globalThis.setTimeout
    try {
      store.name = '同步间隔测试'
      const pending = store.saveData()
      expect(scheduledDelays).toEqual([5000])

      store.setDataSyncInterval(10)
      expect(store.dataSyncIntervalSeconds).toBe(10)
      expect(getPlayerDataSyncDelayMs(store.dataSyncIntervalSeconds)).toBe(10000)
      expect(scheduledDelays).toEqual([5000, 10000])
      await store.flushData()
      await pending
      expect(decryptData(readPersistedPlayerSave()!)).toMatchObject({ dataSyncIntervalSeconds: 10, name: '同步间隔测试' })

      expect(() => store.setDataSyncInterval(4)).toThrow('数据同步间隔无效')
      expect(store.dataSyncIntervalSeconds).toBe(10)
    } finally {
      globalThis.setTimeout = originalSetTimeout
    }
  })

  test('each configured effect contributes to the corresponding effective player stats', () => {
    const effects = [
      ['spiritRate', 0.2], ['cultivationRate', 0.3], ['combatBoost', 0.4],
      ['allAttributes', 0.5], ['spiritCap', 1.5], ['autoHeal', 0.1],
      ['spiritRecovery', 0.4], ['cultivationEfficiency', 0.5],
      ['comprehension', 0.3], ['fireAttribute', 0.6]
    ] as const
    store.items = effects.map(([type, value], index) => ({
      id: 'effect-' + index, name: 'test pill', type: 'pill', effect: { type, value, duration: 60 }
    }))
    for (const item of [...store.items]) {
      expect(item.type).toBe('pill')
      if (item.type === 'pill') expect(store.usePill(item).success).toBe(true)
    }
    expect(store.effectiveSpiritRate).toBeCloseTo(1.9)
    expect(store.effectiveCultivationRate).toBeCloseTo(2)
    expect(store.effectiveBaseAttributes.attack).toBeCloseTo(10 * 1.5 * 1.6)
    expect(store.effectiveCombatAttributes.critRate).toBeCloseTo(0)
    expect(store.effectiveSpecialAttributes.combatBoost).toBeCloseTo(0.4)
    expect(store.effectBonuses.autoHeal).toBeCloseTo(0.1)
    expect(store.effectiveSpiritCap).toBe(2500)
  })

  test('capacity and spirit recovery effects affect gains without deleting old overflow', () => {
    store.spirit = 2000
    store.gainSpirit(10)
    expect(store.spirit).toBe(2000)

    store.spirit = store.effectiveSpiritCap - 1
    store.activeEffects.push({ type: 'spiritRate', value: 1, duration: 60, startTime: 1, endTime: Date.now() + 60_000 })
    store.gainSpirit(10)
    expect(store.spirit).toBe(store.effectiveSpiritCap)

    const defaultCap = store.effectiveSpiritCap
    store.activeEffects.push({ type: 'spiritCap', value: 1.5, duration: 60, startTime: 1, endTime: Date.now() + 60_000 })
    expect(store.effectiveSpiritCap).toBe(defaultCap * 2.5)
  })

  test('expired effects stop affecting derived values and are pruned', () => {
    store.activeEffects.push({ type: 'combatBoost', value: 0.4, duration: 30, startTime: 1, endTime: 100 })
    store.expireEffects(101)
    expect(store.activeEffects).toHaveLength(0)
    expect(store.effectiveSpecialAttributes.combatBoost).toBe(0)
  })

  test('legacy duplicate herbs migrate, write an encrypted local save, then remove IndexedDB', async () => {
    const legacy = {
      ...createInitialState(),
      herbs: Array.from({ length: 500 }, () => ({ id: 'spirit_grass', name: '灵精草', quality: 'common', baseValue: 10, value: 10 })),
      obsoleteWorkerCache: Array.from({ length: 1000 }, () => ({ discarded: true }))
    }
    expect(validateData(legacy)).toBe(true)
    const encrypted = encryptData(legacy)
    expect(encrypted).not.toBeNull()
    await writeLegacySave(encrypted!)
    await store.initializePlayer()

    expect(store.herbs).toHaveLength(1)
    expect(store.herbs[0]?.count).toBe(500)
    expect(store.countHerbs('spirit_grass')).toBe(500)
    expect(memoryStorage.getItem(LEGACY_PLAYER_MIGRATION_KEY)).toBe('true')

    const savedText = readPersistedPlayerSave()
    expect(savedText).toBeString()
    expect(savedText).not.toBe(encrypted)
    const saved = decryptData(savedText!) as Record<string, unknown>
    expect(saved).toBeObject()
    expect('obsoleteWorkerCache' in saved).toBe(false)
    expect('getPetBonus' in saved).toBe(false)
    expect((saved.herbs as Array<{ count: number }>)).toHaveLength(1)
    expect((saved.herbs as Array<{ count: number }>)[0]?.count).toBe(500)
    expect(await readLegacyPlayerSave()).toBeNull()
  })

  test('a corrupt legacy save remains available and is not marked migrated', async () => {
    await writeLegacySave('corrupt legacy data')
    await store.initializePlayer()
    expect(memoryStorage.getItem(LEGACY_PLAYER_MIGRATION_KEY)).toBeNull()
    expect(await readLegacyPlayerSave()).toBe('corrupt legacy data')
  })

  test('a missing persistence plugin cannot delete legacy data or complete migration', async () => {
    const oldStore = createTestStore(false)
    const encrypted = encryptData(createInitialState())
    expect(encrypted).not.toBeNull()
    await writeLegacySave(encrypted!)
    await oldStore.initializePlayer()
    expect(memoryStorage.getItem(LEGACY_PLAYER_MIGRATION_KEY)).toBeNull()
    expect(await readLegacyPlayerSave()).toBe(encrypted)
  })

  test('a validated current save clears legacy data and marks the migration complete', async () => {
    const encrypted = encryptData(createInitialState())
    expect(encrypted).not.toBeNull()
    await writeLegacySave(encrypted!)
    store.name = '已有新版存档'
    await store.flushData()

    await store.initializePlayer()
    expect(store.name).toBe('已有新版存档')
    expect(memoryStorage.getItem(LEGACY_PLAYER_MIGRATION_KEY)).toBe('true')
    expect(await readLegacyPlayerSave()).toBeNull()
  })

  test('save requests coalesce and flushData writes immediately as an encrypted snapshot', async () => {
    store.name = '第一次修改'
    const first = store.saveData()
    store.name = '最终道号'
    store.saveData()
    expect(getPlayerSaveStatus(store).pending).toBe(true)

    await store.flushData()
    await first
    expect(getPlayerSaveStatus(store)).toEqual({ pending: false, writeError: undefined })
    expect(decryptData(readPersistedPlayerSave()!)).toMatchObject({ name: '最终道号' })
  })

  test('import rejects corrupt saves before changing the current game', async () => {
    store.name = '当前道号'
    const before = store.name
    await expect(store.importData('not-an-encrypted-save')).rejects.toThrow()
    expect(store.name).toBe(before)
  })
})
