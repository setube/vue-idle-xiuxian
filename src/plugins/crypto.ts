import CryptoJS from 'crypto-js'
import { assert, assertFiniteNumber, isRecord } from '../utils/assert'

const SAVE_KEY = 'vue-idle-xiuxian'

/** Preserve the original AES envelope so existing exported saves still load. */
export const encryptData = (data: unknown): string | null => {
  try {
    const json = JSON.stringify(data)
    assert(typeof json === 'string', '存档内容不能为空')
    return CryptoJS.AES.encrypt(json, SAVE_KEY).toString()
  } catch (error) {
    console.error('数据加密失败:', error)
    return null
  }
}

export const decryptData = (encryptedData: string): unknown => {
  try {
    assert(typeof encryptedData === 'string' && encryptedData.length > 0, '存档必须是非空文本')
    const bytes = CryptoJS.AES.decrypt(encryptedData, SAVE_KEY)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as unknown
  } catch (error) {
    console.error('数据解密失败:', error)
    return null
  }
}

export function assertPlayerData(data: unknown): asserts data is Record<string, unknown> {
  assert(isRecord(data), '存档必须是对象')
  assert(typeof data.name === 'string' && data.name.length > 0, '存档缺少有效道号')
  assert(typeof data.realm === 'string', '存档缺少境界名称')
  assertFiniteNumber(data.level, '境界等级', 1)
  assert(Number.isSafeInteger(data.level), '境界等级必须是整数')
  assertFiniteNumber(data.cultivation, '修为')
  assertFiniteNumber(data.maxCultivation, '修为上限', 1)
  assertFiniteNumber(data.spirit, '灵力')
  assert(isRecord(data.baseAttributes), '存档缺少基础属性')
  for (const stat of ['attack', 'health', 'defense', 'speed']) assertFiniteNumber(data.baseAttributes[stat], stat)
}

export const validateData = (data: unknown): data is Record<string, unknown> => {
  try { assertPlayerData(data); return true } catch { return false }
}
