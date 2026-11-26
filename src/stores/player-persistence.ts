import type { StateTree } from 'pinia'
import type { Serializer, StorageLike } from 'pinia-plugin-persistedstate'
import { nextTick } from 'vue'
import type { PlayerState } from '../types/player'
import { decryptData, encryptData, validateData, assertPlayerData } from '../plugins/crypto'
import { normalizePlayerData } from './save'

export const PLAYER_SAVE_KEY = 'vue-idle-xiuxian:player:v2'
const SAVE_DELAY_MS = 2000
const AUTO_PERSIST_SENTINEL = ''

export interface PersistablePlayerStore {
  $id: string
  $state: PlayerState
  $persist?: () => void
}

interface PendingSave {
  timer: ReturnType<typeof setTimeout>
  promise: Promise<void>
  resolve: () => void
  reject: (error: unknown) => void
}

interface StorePersistence {
  pending?: PendingSave
  forceCommit: boolean
  serialized: boolean
  written: boolean
  writeError?: unknown
}

let defaultsFactory: (() => PlayerState) | undefined
let registeredStore: PersistablePlayerStore | undefined
let committingStore: PersistablePlayerStore | undefined
const storePersistence = new Map<string, StorePersistence>()
const fallbackStorage = new Map<string, string>()

function persistenceFor(store: PersistablePlayerStore): StorePersistence {
  // Pinia can expose one store through different action proxies. The store id
  // keeps its pending write state consistent across those views.
  let persistence = storePersistence.get(store.$id)
  if (!persistence) {
    persistence = { forceCommit: false, serialized: false, written: false }
    storePersistence.set(store.$id, persistence)
  }
  return persistence
}

function getStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  return typeof localStorage === 'undefined'
    ? {
        getItem: key => fallbackStorage.get(key) ?? null,
        setItem: (key, value) => { fallbackStorage.set(key, String(value)) },
        removeItem: key => { fallbackStorage.delete(key) }
      }
    : localStorage
}

function settlePending(store: PersistablePlayerStore, error?: unknown): void {
  const persistence = persistenceFor(store)
  const pending = persistence.pending
  if (!pending) return
  clearTimeout(pending.timer)
  persistence.pending = undefined
  if (error === undefined) pending.resolve()
  else pending.reject(error)
}

function commit(store: PersistablePlayerStore): void {
  const persistence = persistenceFor(store)
  const previousCommittingStore = committingStore
  persistence.writeError = undefined
  persistence.serialized = false
  persistence.written = false
  persistence.forceCommit = true
  committingStore = store
  try {
    if (typeof store.$persist !== 'function') throw new Error('玩家存档持久化插件未安装')
    store.$persist()
    if (persistence.writeError !== undefined) throw persistence.writeError
    if (!persistence.written) throw new Error('玩家存档未成功写入')
  } catch (error) {
    persistence.writeError = error
    throw error
  } finally {
    persistence.forceCommit = false
    committingStore = previousCommittingStore
  }
}

async function commitPending(store: PersistablePlayerStore): Promise<void> {
  try {
    commit(store)
    settlePending(store)
  } catch (error) {
    settlePending(store, error)
    console.error('玩家存档保存失败:', error)
  }
}

/**
 * Pinia's persistence plugin serializes on every state mutation. Defer AES
 * serialization until the coalesced write, while keeping storage synchronous.
 */
export const playerSaveStorage: StorageLike = {
  getItem(key) {
    return getStorage().getItem(key)
  },
  setItem(key, value) {
    const store = committingStore
    if (store) {
      const persistence = persistenceFor(store)
      if (persistence.forceCommit) {
        if (!persistence.serialized || value === AUTO_PERSIST_SENTINEL) {
          const error = persistence.writeError instanceof Error
            ? persistence.writeError
            : new Error('玩家存档未通过序列化验证')
          persistence.writeError = error
          throw error
        }
        try {
          getStorage().setItem(key, value)
          persistence.written = true
          persistence.serialized = false
          return
        } catch (error) {
          persistence.writeError = error
          throw error
        }
      }
    }
    if (registeredStore) schedulePlayerPersistence(registeredStore)
  }
}

export function createPlayerSaveSerializer(createDefaults: () => PlayerState): Serializer {
  defaultsFactory = createDefaults
  return {
    serialize(data: StateTree): string {
      const store = committingStore
      if (!store) return AUTO_PERSIST_SENTINEL
      const persistence = persistenceFor(store)
      if (!persistence.forceCommit) return AUTO_PERSIST_SENTINEL
      try {
        const normalized = normalizePlayerData(data, createDefaults())
        const encrypted = encryptData(normalized)
        if (!encrypted) throw new Error('玩家存档加密失败')
        persistence.serialized = true
        return encrypted
      } catch (error) {
        persistence.writeError = error
        throw error
      }
    },
    deserialize(encryptedData: string): StateTree {
      const decoded = decryptData(encryptedData)
      if (!validateData(decoded)) throw new Error('本地存档校验失败')
      return normalizePlayerData(decoded, createDefaults()) as StateTree
    }
  }
}

export function isValidPlayerSave(value: unknown): value is PlayerState {
  try {
    assertPlayerData(value)
    normalizePlayerData(value, createDefaults())
    return true
  } catch {
    return false
  }
}

export function readPersistedPlayerState(): PlayerState | null {
  const encryptedData = readPersistedPlayerSave()
  if (encryptedData === null) return null
  const decoded = decryptData(encryptedData)
  if (!validateData(decoded)) return null
  return normalizePlayerData(decoded, createDefaults())
}

export function getPlayerSaveStatus(store = registeredStore): { pending: boolean; writeError: unknown } {
  if (!store) return { pending: false, writeError: undefined }
  const persistence = persistenceFor(store)
  return { pending: persistence.pending !== undefined, writeError: persistence.writeError }
}

function createDefaults(): PlayerState {
  if (!defaultsFactory) throw new Error('玩家存档尚未初始化')
  return defaultsFactory()
}

export function registerPlayerPersistenceStore(store: PersistablePlayerStore): void {
  registeredStore = store
  persistenceFor(store)
}

export function schedulePlayerPersistence(store = registeredStore): Promise<void> {
  if (!store) return Promise.resolve()
  const persistence = persistenceFor(store)
  if (persistence.pending) return persistence.pending.promise

  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  const pending: PendingSave = {
    promise,
    resolve,
    reject,
    timer: setTimeout(() => { void commitPending(store) }, SAVE_DELAY_MS)
  }
  persistence.pending = pending
  void promise.catch(() => undefined)
  return promise
}

/** Force one encrypted write immediately through the configured Pinia serializer. */
export async function persistPlayerImmediately(store = registeredStore): Promise<void> {
  if (!store) throw new Error('玩家存档插件未注册')
  // Let Pinia's queued subscription from the latest synchronous mutation run
  // before committing, so its timer can be cancelled as part of this flush.
  await nextTick()
  try {
    commit(store)
    settlePending(store)
  } catch (error) {
    settlePending(store, error)
    throw error
  }
}

export function readPersistedPlayerSave(): string | null {
  return getStorage().getItem(PLAYER_SAVE_KEY)
}

export function removePersistedPlayerSave(): void {
  getStorage().removeItem(PLAYER_SAVE_KEY)
}
