import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import persistedState from 'pinia-plugin-persistedstate'
import { decryptData, encryptData, validateData } from '../src/plugins/crypto'
import { pillRecipes } from '../src/plugins/pills'
import {
  LEGACY_PLAYER_DB_NAME,
  LEGACY_PLAYER_MIGRATION_KEY,
  readLegacyPlayerSave
} from '../src/stores/legacy-save'
import {
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
    expect(store.effectiveSpiritRate).toBeCloseTo(2.1)
    expect(store.effectiveCultivationRate).toBeCloseTo(2.6)
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
