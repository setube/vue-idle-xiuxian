import type { EquipmentQuality, PetRarity } from '../types/game'

export type GachaPool = 'all' | 'equipment' | 'pet'
type Odds<K extends string> = Record<K, number>
export interface GachaOdds {
  equipment: Odds<EquipmentQuality>
  pet: Odds<PetRarity>
  price: number
}

const equipment: Odds<EquipmentQuality> = {
  common: 0.5, uncommon: 0.3, rare: 0.12, epic: 0.05, legendary: 0.02, mythic: 0.01
}
const pet: Odds<PetRarity> = {
  divine: 0.002, celestial: 0.0581, mystic: 0.1601, spiritual: 0.2801, mortal: 0.4997
}

function weights<K extends string>(base: Odds<K>, share: number, wish: K | null): Odds<K> {
  const odds = { ...base }
  const increase = wish ? Math.min(0.2, base[wish]) : 0
  const otherFactor = wish ? 1 - increase / (1 - base[wish]) : 1
  for (const key in odds) {
    odds[key] = share * (key === wish ? base[key] + increase : base[key] * otherFactor)
  }
  return odds
}

export function getGachaOdds(pool: GachaPool, equipWish: string | null, petWish: string | null): GachaOdds {
  const eq = pool !== 'pet' && equipWish && Object.hasOwn(equipment, equipWish) ? equipWish as EquipmentQuality : null
  const petChoice = pool !== 'equipment' && petWish && Object.hasOwn(pet, petWish) ? petWish as PetRarity : null
  return {
    equipment: weights(equipment, pool === 'all' ? 0.5 : Number(pool === 'equipment'), eq),
    pet: weights(pet, pool === 'all' ? 0.5 : Number(pool === 'pet'), petChoice),
    price: eq || petChoice ? 200 : 100
  }
}

export function rollGacha(odds: GachaOdds, roll = Math.random()):
  { type: 'equipment'; quality: EquipmentQuality } | { type: 'pet'; rarity: PetRarity } {
  let end = 0
  for (const quality of Object.keys(odds.equipment) as EquipmentQuality[]) {
    end += odds.equipment[quality]
    if (roll < end) return { type: 'equipment', quality }
  }
  for (const rarity of Object.keys(odds.pet) as PetRarity[]) {
    end += odds.pet[rarity]
    if (roll < end) return { type: 'pet', rarity }
  }
  // Floating point addition can leave the last interval one ulp short of 1.
  return odds.pet.mortal > 0 ? { type: 'pet', rarity: 'mortal' } : { type: 'equipment', quality: 'mythic' }
}
