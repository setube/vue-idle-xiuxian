/** Serializable domain values shared by the store, views and workers. */
export type Stats = Record<string, number>
export type ItemId = string | number
export const equipmentNames = { weapon: '武器', head: '头冠', body: '衣甲', feet: '鞋履', wrist: '护腕', necklace: '项链', ring: '戒指', artifact: '法宝' } as const
export type EquipmentSlot = keyof typeof equipmentNames
export const equipmentSlots = Object.keys(equipmentNames) as EquipmentSlot[]
export type EquipmentQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type PetRarity = 'mortal' | 'spiritual' | 'mystic' | 'celestial' | 'divine'
export type HerbQuality = Exclude<EquipmentQuality, 'mythic'>
export interface QualityInfo { name: string; color: string; statMod: number; probability?: number }
export interface Equipment {
  unread?: boolean
  id: ItemId
  name: string
  type: EquipmentSlot
  quality: string
  stats: Stats
  slot?: EquipmentSlot
  equipType?: EquipmentSlot
  level?: number
  enhanceLevel?: number
  requiredRealm?: number
  description?: string
  qualityInfo?: QualityInfo
}
export interface Pet {
  id: ItemId
  name: string
  type: 'pet'
  rarity: string
  level: number
  star: number
  starProgress?: number
  baseRoll?: Stats
  combatAttributes: Stats
  description?: string
  quality?: Stats
  power?: number
  experience?: number
  maxExperience?: number
  upgradeItems?: number
}
export interface PillEffect { type: string; value: number; duration: number; successRate?: number }
export interface ActiveEffect extends PillEffect { startTime: number; endTime: number; id?: ItemId; name?: string }
export interface Pill { id: ItemId; name: string; type: 'pill'; effect: PillEffect; description?: string; grade?: string }
export interface Herb {
  id: string
  name: string
  quality: string
  baseValue: number
  description?: string
  category?: string
  chance?: number
  value: number
  count?: number
}
export type GameItem = Equipment | Pet | Pill
export type MessageType = 'success' | 'info' | 'warning' | 'error'
export type ShowMessage = (type: MessageType, content: string) => unknown
export type RewardType = 'spirit_stone' | 'herb' | 'cultivation' | 'pill_fragment'
export interface Reward { type: RewardType; amount: number }
export interface RewardOption { type: RewardType; chance: number; amount: [number, number] }
export interface ExplorationLocation { id: string; name: string; description: string; minLevel: number; spiritCost: number; herbIds: string[]; rewards: RewardOption[] }
export interface ExplorationResult { type: 'exploration_result'; locationId: string; eventTriggered: boolean; rewardMultiplier: number; spiritCost: number }
export interface WorkerError { type: 'error'; message: string }
export interface LogEntry { type: MessageType; content: string; time?: string; id?: ItemId }
