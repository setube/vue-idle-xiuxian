import type { EquipmentQuality, QualityInfo } from '../types/game'

type QualityConfig = QualityInfo & { maxStatMod: number }

export const equipmentQualities = {
  common: { name: '凡品', color: '#9e9e9e', statMod: 1.0, maxStatMod: 1.5 },
  uncommon: { name: '下品', color: '#4caf50', statMod: 1.2, maxStatMod: 2.0 },
  rare: { name: '中品', color: '#2196f3', statMod: 1.5, maxStatMod: 2.5 },
  epic: { name: '上品', color: '#9c27b0', statMod: 2.0, maxStatMod: 3.0 },
  legendary: { name: '极品', color: '#ff9800', statMod: 2.5, maxStatMod: 3.5 },
  mythic: { name: '仙品', color: '#e91e63', statMod: 3.0, maxStatMod: 4.0 }
} satisfies Record<EquipmentQuality, QualityConfig>

export function isEquipmentQuality(quality: string): quality is EquipmentQuality {
  return Object.hasOwn(equipmentQualities, quality)
}
