import { beforeEach, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { MAX_OFFLINE_SECONDS, usePlayerStore } from '../src/stores/player'
import { normalizePlayerData } from '../src/stores/save'

const hour = 3_600_000, start = 100_000
beforeEach(() => setActivePinia(createPinia()))

test('idle rewards require progress on the selected difficulty and do not depend on spirit capacity', () => {
  const p = usePlayerStore()
  p.dungeonHighestFloor = 5
  p.spirit = p.effectiveSpiritCap
  expect(p.setIdleFloor(1,6,start)).toBe(false)
  expect(p.setIdleFloor(2,5,start)).toBe(false)
  expect(p.setIdleFloor(3,1,start)).toBe(false)
  expect(p.setIdleFloor(1,5,start)).toBe(true)
  const end = start + 20 * hour
  p.tickDungeonIdle(end, true)
  expect(p.dungeonIdle.away).toEqual({ ms: MAX_OFFLINE_SECONDS * 1000, stones: 4800, refinement: 40 })
  expect([p.spiritStones, p.refinementStones, p.spirit]).toEqual([4800,40,p.effectiveSpiritCap])
  const restored = normalizePlayerData(JSON.parse(JSON.stringify(p.$state)),p.$state)
  p.$patch(restored)
  p.tickDungeonIdle(end, true)
  p.tickDungeonIdle(end - hour)
  expect([p.spiritStones,p.refinementStones,p.dungeonTotalKills]).toEqual([4800,40,0])
})

test('challenge time is excluded; switching layers, stopping and restarting preserve partial rewards', () => {
  const p = usePlayerStore()
  p.dungeonHighestFloor = 5
  p.setIdleFloor(1,1,start)
  p.setDungeonChallenge(true,start + 15_000)
  p.tickDungeonIdle(start + hour)
  expect(p.spiritStones).toBe(0)
  p.setDungeonChallenge(false,start + 2 * hour)
  p.tickDungeonIdle(start + 2 * hour + 15_000)
  expect(p.spiritStones).toBe(1)
  p.setIdleFloor(1,5,start + 2 * hour + 15_000)
  p.setIdleFloor(1,0,start + 3 * hour + 15_000)
  p.tickDungeonIdle(start + 5 * hour)
  expect([p.spiritStones,p.refinementStones]).toEqual([601,5])
  p.setIdleFloor(1,1,start + 6 * hour)
  p.tickDungeonIdle(start + 7 * hour)
  expect([p.spiritStones,p.refinementStones]).toEqual([721,6])
})

test('unconfigured saves stay disabled and corrupt idle targets cannot earn', () => {
  const p = usePlayerStore()
  const raw = JSON.parse(JSON.stringify(p.$state))
  delete raw.dungeonIdle
  expect(normalizePlayerData(raw,p.$state).dungeonIdle.floor).toBe(0)
  raw.dungeonIdle = { ...p.dungeonIdle, floor: 9, at: start }
  expect(() => normalizePlayerData(raw,p.$state)).toThrow()
})
