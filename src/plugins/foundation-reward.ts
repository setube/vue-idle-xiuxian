import { rollEquipmentStats } from './equipment-stats'
import type { Equipment } from '../types/game'

export const foundationLevel = 10
const choices = [
  { type: 'weapon', name: '筑基·斩岳剑' },
  { type: 'body', name: '筑基·玄岩甲' },
  { type: 'necklace', name: '筑基·聚灵佩' }
] as const

// Fixed mid-roll items let players compare the same offers before and after a reload.
export const foundationGear: readonly Equipment[] = choices.map(({ type, name }) => ({
  id: 'foundation-' + type, name, type, quality: 'rare', level: foundationLevel, requiredRealm: foundationLevel,
  stats: rollEquipmentStats(type, 'rare', foundationLevel, () => 0.5)
}))
