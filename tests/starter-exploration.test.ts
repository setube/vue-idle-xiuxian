import { beforeEach, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore, createInitialState } from '../src/stores/player'
import { useExplorationStore, starterSwordId } from '../src/stores/exploration'
import { normalizePlayerData } from '../src/stores/save'
import { locations } from '../src/plugins/locations'
import { events } from '../src/plugins/events'

beforeEach(() => setActivePinia(createPinia()))
const village = locations[0]!

test.each(['ancient_tablet', 'ancient_master', 'enlightenment'])('%s breaks through without meditation', id => {
  const player = usePlayerStore()
  player.cultivation = player.maxCultivation - 1
  events.find(event => event.id === id)!.effect(player, () => {})
  expect(player.level).toBe(2)
  expect(player.breakthroughCount).toBe(1)
  expect(player.cultivation).toBe(0)
  expect(player.totalCultivationTime).toBe(0)
})

test('the village awards one free sword and persists the trial before equipping it', () => {
  const player = usePlayerStore(), exploration = useExplorationStore()
  player.isNewPlayer = false
  expect(exploration.visit(village)).toBe(true)
  expect(exploration.visit(village)).toBe(false)
  const restored = normalizePlayerData(player.$state, createInitialState())
  expect(restored.explorationCount).toBe(1)
  expect(restored.items.filter(item => item.id === starterSwordId)).toHaveLength(1)
  expect(restored.journeyStage).toBe('trial')
  const sword = player.items[0]!
  if (sword.type !== 'weapon') throw new Error('missing starter weapon')
  const before = player.baseAttributes.attack
  player.equipArtifact(sword, 'weapon')
  expect(player.baseAttributes.attack).toBe(before + 12)
})

test('previously active legacy saves retain progress without replaying the intro', () => {
  const data = { ...createInitialState(), journeyStage: undefined, explorationCount: 9, isNewPlayer: false }
  const restored = normalizePlayerData(data, createInitialState())
  expect(restored.journeyStage).toBe('done')
  expect(restored.explorationCount).toBe(9)
  expect(restored.autoExploreLocation).toBe('')
  const equipped = { ...data, explorationCount: 0, equippedArtifacts: { ...data.equippedArtifacts,
    weapon: { id: 'old', name: '旧剑', type: 'weapon', quality: 'common', stats: { attack: 2 } } } }
  expect(normalizePlayerData(equipped, createInitialState()).journeyStage).toBe('done')
})

test('village visits unlock targeted harvests and persist the improved yield', () => {
  const player = usePlayerStore(), explore = useExplorationStore()
  expect(explore.visit(village)).toBe(true)
  expect(explore.visit(village)).toBe(false)
  player.spirit = 1000
  expect(explore.visit(village, 'cloud_flower')).toBe(false)
  expect(player.locationVisits[village.id]).toBe(1)
  explore.toggle(village)
  explore.tick(1000)
  explore.tick(4000)
  explore.toggle(village)
  expect(player.locationVisits[village.id]).toBe(3)
  const grass = player.countHerbs('spirit_grass'), flowers = player.countHerbs('cloud_flower')
  const spirit = player.spirit
  for (const id of ['spirit_grass', 'spirit_grass', 'cloud_flower'] as const) expect(explore.visit(village, id)).toBe(true)
  expect(player.countHerbs('spirit_grass')).toBe(grass + 2)
  expect(player.countHerbs('cloud_flower')).toBe(flowers + 1)
  expect(player.spirit).toBe(spirit - 300)
  const restored = normalizePlayerData(player.$state, createInitialState())
  expect(restored.locationVisits[village.id]).toBe(6)
  expect(explore.visit(village, 'cloud_flower')).toBe(true)
  expect(player.countHerbs('cloud_flower')).toBe(flowers + 3)
})

test('waiting exploration resumes when funded and respects cultivation priority and its cooldown', () => {
  const player = usePlayerStore(), exploration = useExplorationStore()
  player.journeyStage = 'done'
  player.maxCultivation = 4000
  player.autoCultivationEnabled = true
  player.spirit = 90
  exploration.toggle(village)
  exploration.tick(10000)
  expect(player.spirit).toBe(90)
  expect(player.explorationCount).toBe(0)
  player.spirit = 100
  exploration.tick(11000)
  expect(player.explorationCount).toBe(1)
  player.spirit = 100
  exploration.tick(12000)
  expect(player.explorationCount).toBe(1)
  player.explorationFirst = false
  exploration.tick(14000)
  expect(player.spirit).toBeLessThan(100)
  expect(player.explorationCount).toBe(1)
  expect(player.autoExploreLocation).toBe(village.id)
  exploration.toggle(village)
  expect(player.autoExploreLocation).toBe('')
})

test('equal quality picks a strict improvement and keeps a choice with a trade-off manual', () => {
  const p = usePlayerStore()
  const sword = { id: 'first', name: '剑', type: 'weapon' as const, quality: 'common', stats: { attack: 5, speed: 2 } }
  p.items.push(sword)
  p.equipArtifact(sword, sword.type)
  p.items.push({ ...sword, id: 'faster', stats: { attack: 4, speed: 8 } }, { ...sword, id: 'upgrade', stats: { attack: 6, speed: 2 } })
  expect(p.bestQualityCandidates().map(i => i.id)).toEqual(['upgrade'])
})
