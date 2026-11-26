import type { ActiveEffect, Equipment, EquipmentSlot, GameItem, Herb, Pet, Stats } from './game'

export interface PlayerState {
  isNewPlayer: boolean
  isGMMode: boolean
  isDarkMode: boolean
  activePet: Pet | null
  petEssence: number
  petConfig: { rarityMap: Record<string, { name: string; color: string; probability: number; essenceBonus: number }> }
  name: string
  nameChangeCount: number
  level: number
  realm: string
  cultivation: number
  maxCultivation: number
  spirit: number
  spiritRate: number
  luck: number
  cultivationRate: number
  herbRate: number
  alchemyRate: number
  pills: GameItem[]
  pillFragments: Record<string, number>
  pillRecipes: string[]
  activeEffects: ActiveEffect[]
  pillsCrafted: number
  pillsConsumed: number
  baseAttributes: Stats
  combatAttributes: Stats
  combatResistance: Stats
  specialAttributes: Stats
  spiritStones: number
  reinforceStones: number
  refinementStones: number
  herbs: Herb[]
  items: GameItem[]
  artifacts: Equipment[]
  equippedArtifacts: Record<EquipmentSlot, Equipment | null>
  artifactBonuses: Stats
  totalCultivationTime: number
  breakthroughCount: number
  explorationCount: number
  itemsFound: number
  eventTriggered: number
  unlockedPillRecipes: number
  dungeonDifficulty: number
  dungeonHighestFloor: number
  dungeonHighestFloor_2: number
  dungeonHighestFloor_5: number
  dungeonHighestFloor_10: number
  dungeonHighestFloor_100: number
  dungeonLastFailedFloor: number
  dungeonTotalRuns: number
  dungeonBossKills: number
  dungeonEliteKills: number
  dungeonTotalKills: number
  dungeonDeathCount: number
  dungeonTotalRewards: number
  autoSellQualities: string[]
  autoReleaseRarities: string[]
  wishlistEnabled: boolean
  selectedWishEquipQuality: string | null
  selectedWishPetRarity: string | null
  unlockedRealms: string[]
  unlockedLocations: string[]
  unlockedSkills: string[]
  completedAchievements: string[]
}

export interface ActionResult { success: boolean; message: string }
