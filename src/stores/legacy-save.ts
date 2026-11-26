/** One-time, read-only import and cleanup for the IndexedDB format used by v1.0.5. */
export const LEGACY_PLAYER_DB_NAME = 'idle-xiuxian'
export const LEGACY_PLAYER_MIGRATION_KEY = 'vue-idle-xiuxian:player:indexeddb-v1-migrated'
const LEGACY_STORE_NAME = 'player-data'
const LEGACY_RECORD_KEY = 'playerData'

export async function readLegacyPlayerSave(): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null
  const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_PLAYER_DB_NAME)
    request.onerror = () => reject(request.error ?? new Error('无法读取旧版存档数据库'))
    request.onblocked = () => reject(new Error('旧版存档数据库仍由其他页面占用'))
    request.onsuccess = () => resolve(request.result)
  })
  if (!db) return null
  if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    db.close()
    return null
  }
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction(LEGACY_STORE_NAME, 'readonly')
      const request = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_RECORD_KEY)
      request.onerror = () => reject(request.error ?? new Error('无法读取旧版玩家存档'))
      transaction.onerror = () => reject(transaction.error ?? new Error('读取旧版玩家存档失败'))
      request.onsuccess = () => {
        if (request.result === undefined || request.result === null) { resolve(null); return }
        if (typeof request.result !== 'string') { reject(new Error('旧版玩家存档格式无效')); return }
        resolve(request.result)
      }
    })
  } finally {
    db.close()
  }
}

/** Deletion is best effort if another old-version tab still has the database open. */
export async function deleteLegacyPlayerDatabase(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return true
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase(LEGACY_PLAYER_DB_NAME)
    request.onsuccess = () => resolve(true)
    request.onerror = () => resolve(false)
    request.onblocked = () => resolve(false)
  })
}
