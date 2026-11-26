import { assert, assertFiniteNumber, isRecord } from '../utils/assert'
import type { ExplorationLocation, ExplorationResult, WorkerError } from '../types/game'

interface ExplorationRequest { type: 'explore'; playerData: { luck: number }; location: Pick<ExplorationLocation, 'id' | 'spiritCost'> }

const calculateEventChance = (luck: number) => 0.3 * luck
const calculateRewardMultiplier = (luck: number) => Math.random() < Math.min(1, 0.5 * luck) ? 1.5 : 1

function handleExploration(playerData: ExplorationRequest['playerData'], location: ExplorationRequest['location']): ExplorationResult {
  const eventTriggered = Math.random() < Math.min(1, calculateEventChance(playerData.luck))
  return {
    type: 'exploration_result',
    locationId: location.id,
    eventTriggered,
    rewardMultiplier: eventTriggered ? 1 : calculateRewardMultiplier(playerData.luck),
    spiritCost: location.spiritCost
  }
}

self.onmessage = ({ data }: MessageEvent<unknown>) => {
  try {
    assert(isRecord(data) && data.type === 'explore' && isRecord(data.playerData) && isRecord(data.location), '无效的探索请求')
    const request = data as unknown as ExplorationRequest
    assertFiniteNumber(request.playerData.luck, '幸运值')
    assert(typeof request.location.id === 'string' && request.location.id.length > 0, '无效的探索地点')
    assertFiniteNumber(request.location.spiritCost, '探索消耗')
    self.postMessage(handleExploration(request.playerData, request.location))
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '探索计算出错' } satisfies WorkerError)
  }
}
