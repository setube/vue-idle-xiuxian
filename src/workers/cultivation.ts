import { assert, isRecord } from '../utils/assert'
import { assertCultivationSnapshot, calculateCultivationBatch } from '../utils/cultivation'

self.onmessage = ({ data }: MessageEvent<unknown>) => {
  try {
    assert(isRecord(data) && data.type === 'cultivateUntilBreakthrough', '无效的修炼请求')
    assertCultivationSnapshot(data.playerData)
    self.postMessage({ type: 'success', result: calculateCultivationBatch(data.playerData) })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '修炼计算出错' })
  }
}
