import type { ActiveEffect, EquipmentSlot, GameItem, Herb, Pet, Stats } from '../types/game'
import type { PlayerState } from '../types/player'
import { assertPlayerData } from '../plugins/crypto'
import { getRealmLength } from '../plugins/realm'
import { assert, assertFiniteNumber, isRecord } from '../utils/assert'

const slots: EquipmentSlot[] = ['weapon', 'head', 'body', 'legs', 'feet', 'shoulder', 'hands', 'wrist', 'necklace', 'ring1', 'ring2', 'belt', 'artifact']
const effectTypes = new Set(['spiritRate', 'cultivationRate', 'combatBoost', 'allAttributes', 'spiritCap', 'autoHeal', 'spiritRecovery', 'cultivationEfficiency', 'comprehension', 'fireAttribute'])
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype'])

function readStats(value: unknown): Stats {
  assert(isRecord(value), '属性必须是对象')
  const stats: Stats = {}
  for (const [key, amount] of Object.entries(value)) {
    assert(!forbiddenKeys.has(key), '属性名称无效')
    assertFiniteNumber(amount, key, -Number.MAX_VALUE)
    stats[key] = amount
  }
  return stats
}

function readItem(value: unknown): GameItem {
  assert(isRecord(value), '物品数据无效')
  assert((typeof value.id === 'string' && value.id.length > 0) || (typeof value.id === 'number' && Number.isFinite(value.id)), '物品编号无效')
  assert(typeof value.name === 'string' && typeof value.type === 'string', '物品名称或类型无效')
  const common = { id: value.id, name: value.name, description: typeof value.description === 'string' ? value.description : undefined }
  if (value.type === 'pill') {
    assert(isRecord(value.effect) && typeof value.effect.type === 'string' && effectTypes.has(value.effect.type), '丹药效果类型无效')
    assertFiniteNumber(value.effect.value, '丹药效果')
    assertFiniteNumber(value.effect.duration, '丹药持续时间', 1)
    return { ...common, type: 'pill', effect: { type: value.effect.type, value: value.effect.value, duration: value.effect.duration } }
  }
  if (value.type === 'pet') {
    assert(typeof value.rarity === 'string', '灵宠品质无效')
    const level = value.level ?? 1
    const star = value.star ?? 0
    assertFiniteNumber(level, '灵宠等级', 1)
    assertFiniteNumber(star, '灵宠星级')
    const pet: Pet = { ...common, type: 'pet', rarity: value.rarity, level, star, combatAttributes: readStats(value.combatAttributes) }
    if (value.quality !== undefined) pet.quality = readStats(value.quality)
    for (const key of ['power', 'experience', 'maxExperience', 'upgradeItems'] as const) {
      const amount = value[key]
      if (amount !== undefined) { assertFiniteNumber(amount, key); pet[key] = amount }
    }
    return pet
  }
  assert(slots.includes(value.type as EquipmentSlot), '装备栏位无效')
  assert(typeof value.quality === 'string', '装备品质无效')
  const equipment = { ...common, type: value.type as EquipmentSlot, quality: value.quality, stats: readStats(value.stats) }
  const optional: Partial<Record<'level' | 'enhanceLevel' | 'requiredRealm', number>> = {}
  for (const key of ['level', 'enhanceLevel', 'requiredRealm'] as const) {
    const amount = value[key]
    if (amount !== undefined) { assertFiniteNumber(amount, key); optional[key] = amount }
  }
  return { ...equipment, ...optional, equipType: equipment.type }
}

/** Old saves stored every picked herb separately. Preserve all units in bounded stacks. */
export function stackHerbs(values: readonly unknown[]): Herb[] {
  const stacks = new Map<string, Herb>()
  for (const value of values) {
    assert(isRecord(value), '灵草数据无效')
    assert(typeof value.id === 'string' && typeof value.name === 'string' && typeof value.quality === 'string', '灵草类型或品质无效')
    assertFiniteNumber(value.baseValue, '灵草价值')
    const count = value.count ?? 1
    assertFiniteNumber(count, '灵草数量', 1)
    assert(Number.isSafeInteger(count), '灵草数量必须是整数')
    const key = String(value.id) + ':' + String(value.quality)
    const stack = stacks.get(key)
    if (stack) {
      const total = (stack.count ?? 1) + count
      assert(Number.isSafeInteger(total), '灵草数量超出可存储范围')
      stack.count = total
    } else {
      const price = value.value ?? value.baseValue
      assertFiniteNumber(price, '灵草售价')
      stacks.set(key, {
        id: value.id, name: value.name, quality: value.quality, baseValue: value.baseValue, value: price, count,
        description: typeof value.description === 'string' ? value.description : undefined,
        category: typeof value.category === 'string' ? value.category : undefined
      })
    }
  }
  return [...stacks.values()]
}

/** Validate before mutating live state; copy only declared state fields from legacy saves. */
export function normalizePlayerData(value: unknown, defaults: PlayerState, now = Date.now()): PlayerState {
  assertPlayerData(value)
  assert((value.level as number) <= getRealmLength(), '境界等级超出范围')
  const normalized: Record<string, unknown> = {}
  for (const [key, initial] of Object.entries(defaults)) {
    const saved = value[key] ?? initial
    if (typeof initial === 'number') assertFiniteNumber(saved, key)
    else if (typeof initial === 'string') assert(typeof saved === 'string', key + '必须是文本')
    else if (typeof initial === 'boolean') assert(typeof saved === 'boolean', key + '必须是布尔值')
    else if (Array.isArray(initial)) assert(Array.isArray(saved), key + '必须是数组')
    normalized[key] = saved
  }
  for (const key of ['baseAttributes', 'combatAttributes', 'combatResistance', 'specialAttributes', 'artifactBonuses'] as const) {
    normalized[key] = { ...defaults[key], ...readStats(normalized[key]) }
  }
  for (const key of ['pillRecipes', 'autoSellQualities', 'autoReleaseRarities', 'unlockedRealms', 'unlockedLocations', 'unlockedSkills', 'completedAchievements'] as const) {
    const values = normalized[key] as unknown[]
    assert(values.every(entry => typeof entry === 'string'), key + '包含无效值')
    normalized[key] = [...new Set(values)]
  }
  normalized.items = (normalized.items as unknown[]).map(readItem)
  normalized.pills = (normalized.pills as unknown[]).map(readItem)
  normalized.artifacts = (normalized.artifacts as unknown[]).map(entry => {
    const item = readItem(entry)
    assert(item.type !== 'pet' && item.type !== 'pill', '装备数据无效')
    return item
  })
  normalized.herbs = stackHerbs(normalized.herbs as unknown[])
  const equipped = normalized.equippedArtifacts
  assert(isRecord(equipped), '装备栏数据无效')
  normalized.equippedArtifacts = Object.fromEntries(slots.map(slot => {
    const itemData = equipped[slot]
    if (!itemData) return [slot, null]
    const item = readItem(itemData)
    assert(item.type !== 'pet' && item.type !== 'pill', '装备栏中存在无效物品')
    return [slot, item]
  }))
  if (normalized.activePet) {
    const pet = readItem(normalized.activePet)
    assert(pet.type === 'pet', '出战灵宠数据无效')
    normalized.activePet = pet
  }
  normalized.pillFragments = readStats(normalized.pillFragments)
  for (const count of Object.values(normalized.pillFragments as Stats)) assert(Number.isSafeInteger(count) && count >= 0, '丹方残页数量无效')
  normalized.activeEffects = (normalized.activeEffects as unknown[]).flatMap(entry => {
    assert(isRecord(entry), '丹药效果数据无效')
    assertFiniteNumber(entry.endTime, '效果结束时间')
    if (entry.endTime <= now) return []
    assert(typeof entry.type === 'string' && effectTypes.has(entry.type), '丹药效果类型无效')
    assertFiniteNumber(entry.value, '丹药效果')
    assertFiniteNumber(entry.duration, '效果持续时间', 1)
    assertFiniteNumber(entry.startTime, '效果开始时间')
    const effect: ActiveEffect = { type: entry.type, value: entry.value, duration: entry.duration, startTime: entry.startTime, endTime: entry.endTime }
    if (typeof entry.name === 'string') effect.name = entry.name
    return [effect]
  })
  for (const key of ['selectedWishEquipQuality', 'selectedWishPetRarity']) assert(normalized[key] === null || typeof normalized[key] === 'string', '心愿单设置无效')
  normalized.petConfig = defaults.petConfig
  return normalized as unknown as PlayerState
}
