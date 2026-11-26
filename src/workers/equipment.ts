import { assert, isRecord } from '../utils/assert'
import type { Equipment, ItemId } from '../types/game'

const qualityStoneMap: Record<string, number> = {
  mythic: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1
}

self.onmessage = ({ data }: MessageEvent<unknown>) => {
  try {
    assert(isRecord(data) && (data.type === 'single' || data.type === 'batch'), '无效的售卖请求')
    if (data.type === 'single') {
      assert(isRecord(data.equipment), '无效的装备')
      assert((typeof data.equipment.id === 'string' || typeof data.equipment.id === 'number') && typeof data.equipment.quality === 'string' && Object.hasOwn(qualityStoneMap, data.equipment.quality), '无效的装备')
      self.postMessage({ type: 'single', stoneAmount: qualityStoneMap[data.equipment.quality], itemId: data.equipment.id })
      return
    }
    assert(Array.isArray(data.items) && data.items.length <= 100_000, '售卖物品数量超出安全限制')
    let totalStones = 0
    const itemsToRemove: ItemId[] = []
    for (const item of data.items) {
      assert(isRecord(item) && (typeof item.id === 'string' || typeof item.id === 'number') && typeof item.quality === 'string' && Object.hasOwn(qualityStoneMap, item.quality), '无效的售卖装备')
      totalStones += qualityStoneMap[item.quality]
      itemsToRemove.push(item.id)
    }
    self.postMessage({ type: 'batch', totalStones, itemsToRemove, count: itemsToRemove.length })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '售卖计算出错' })
  }
}
