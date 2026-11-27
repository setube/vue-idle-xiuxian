import type { GameItem, Pet, Stats } from '../types/game'
import type { PlayerState } from '../types/player'
import { equipmentDifferences } from './equipment-stats'

type Attributes = Pick<PlayerState, 'baseAttributes' | 'combatAttributes' | 'combatResistance' | 'specialAttributes'>

export function projectedChanges(player: Attributes, effects: Stats, next: Stats, current: Stats = {}) {
  const changes = equipmentDifferences(next, current)
  const all = 1 + (effects.allAttributes ?? 0)
  for (const [key, delta] of Object.entries(changes)) {
    if (key in player.baseAttributes) {
      changes[key] = delta * all * (key === 'attack' ? 1 + (effects.fireAttribute ?? 0) : 1)
    } else if (key in player.combatAttributes || key in player.combatResistance) {
      const base = player.combatAttributes[key] ?? player.combatResistance[key]
      changes[key] = Math.min(1, Math.max(0, base + delta) * all) - Math.min(1, base * all)
    }
    if (Math.abs(changes[key]) < 1e-9) delete changes[key]
  }
  return changes
}

// One percentage point is one point; economy stats are ranked separately.
export function battlePoints(stats: Stats, decimals = 1) {
  let score = 0
  const weights: Stats = { attack: 2, defense: 1.5, health: 0.1, speed: 1, spiritRate: 0, cultivationRate: 0, luck: 0 }
  for (const [key, value] of Object.entries(stats)) score += value * (weights[key] ?? 100)
  const scale = 10 ** decimals
  return Math.round(score * scale) / scale
}

export function petFamily(pet: Pet) {
  return JSON.stringify([pet.name, pet.rarity])
}
export function isPet(item: GameItem): item is Pet { return item.type === 'pet' }

export function petRoster(pets: Pet[], activeId?: Pet['id'], score = (p: Pet) => battlePoints(p.combatAttributes)) {
  const groups = new Map<string, Pet[]>()
  const surplus = new Set<Pet['id']>()
  const evolvable = new Set<Pet['id']>()
  for (const pet of pets) {
    const key = petFamily(pet)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(pet)
  }
  const materialCounts = new Map<string, number>()
  for (const pet of pets) {
    if (pet.id !== activeId) materialCounts.set(pet.rarity, (materialCounts.get(pet.rarity) ?? 0) + 1)
  }
  for (const pet of pets) {
    if ((materialCounts.get(pet.rarity) ?? 0) > (pet.id === activeId ? 0 : 1)) evolvable.add(pet.id)
  }
  for (const family of groups.values()) {
    const kept = family.filter(p => p.id === activeId || p.level > 1 || p.star > 0 || !!p.starProgress)
    const spare = family.filter(p => p.id !== activeId && p.level <= 1 && !p.star && !p.starProgress)
    spare.sort((a, b) => score(b) - score(a))
    // Keep a main pet and an untrained copy for its next star whenever available.
    for (const pet of spare.slice(kept.length ? 1 : 2)) surplus.add(pet.id)
  }
  return { surplus, evolvable }
}

export interface ReleaseQuote { ids: Pet['id'][]; essence: number }
export function splitEssence(total: number) {
  const draw = Math.floor(total / 2)
  return { draw, release: total - draw }
}
