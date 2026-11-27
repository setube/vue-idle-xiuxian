import { assert, assertFiniteNumber, isRecord } from '../utils/assert'
import type { ExplorationLocation, WorkerError } from '../types/game'

import { rollExploration } from '../plugins/locations'

interface ExplorationRequest { type: 'explore'; playerData: { luck: number }; location: Pick<ExplorationLocation, 'id' | 'spiritCost'> }

self.onmessage = ({ data }: MessageEvent<unknown>) => {
  try {
    assert(isRecord(data) && data.type === 'explore' && isRecord(data.playerData) && isRecord(data.location), '无效的探索请求')
    const request = data as unknown as ExplorationRequest
    assertFiniteNumber(request.playerData.luck, '幸运值')
    assert(typeof request.location.id === 'string' && request.location.id.length > 0, '无效的探索地点')
    assertFiniteNumber(request.location.spiritCost, '探索消耗')
    self.postMessage(rollExploration(request.playerData, request.location))
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '探索计算出错' } satisfies WorkerError)
  }
}
