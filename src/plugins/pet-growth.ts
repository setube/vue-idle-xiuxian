import type { Pet } from '../types/game'

const traits = {
  initiative: { name: '先手', description: '首回合先于敌人行动' },
  guard: { name: '护体', description: '每场战斗第一次受击减伤 35%' },
  pursuit: { name: '追击', description: '从第 3 回合起造成的伤害提高 20%' }
} as const
export type PetTrait = keyof typeof traits
const species: Record<PetTrait, readonly string[]> = {
  initiative: ['灵猫', '幻蝶', '风隼', '云豹', '雷鹰', '嘲风', '螭吻', '青龙', '应龙', '穷奇'],
  guard: ['草兔', '玄龟', '地甲', '岩龟', '霸下', '狴犴', '负屃', '玄武', '麒麟', '混沌'],
  pursuit: ['火鼠', '冰狼', '火凤凰', '囚牛', '睚眦', '蒲牢', '狻犴', '白虎', '朱雀', '饕餮', '梼杌']
}
export function petTrait(name: string): PetTrait | undefined {
  return (Object.keys(species) as PetTrait[]).find(kind => species[kind].includes(name))
}
export function traitText(name: string) {
  const kind = petTrait(name)
  return kind ? traits[kind].name + ' · ' + traits[kind].description : ''
}

export const upgradeCost = (pet: Pet) => 10 * pet.level
export const investedEssence = (level: number) => 5 * level * (level - 1)
export const nextStarCost = (star: number) => 2 * (star + 1)
const investedStars = (star: number) => star * (star + 1)
export const starValue = (target: Pet, food: Pet) =>
  (target.name === food.name ? 2 : 1) + investedStars(food.star) + (food.starProgress ?? 0)

export function starResult(target: Pet, food: Pet) {
  const total = investedStars(target.star) + (target.starProgress ?? 0) + starValue(target, food)
  const star = Math.floor((Math.sqrt(1 + 4 * total) - 1) / 2)
  return { star, progress: total - investedStars(star) }
}
export function transferPlan(source: Pet, target: Pet) {
  const total = investedEssence(source.level) + investedEssence(target.level)
  const level = Math.floor((1 + Math.sqrt(1 + 0.8 * total)) / 2)
  return { level, remainder: total - investedEssence(level) }
}

const rate: Record<string, number> = { mortal: 0.012, spiritual: 0.014, mystic: 0.016, celestial: 0.018, divine: 0.02 }
const basicStats = new Set(['attack', 'health', 'defense', 'speed'])

// An unmodified roll is shared by the level and star calculations, so inheriting twice is reversible.
export function setPetGrowth(pet: Pet, level: number, star: number) {
  const perLevel = rate[pet.rarity] ?? 0.012
  if (!pet.baseRoll) {
    const bonus = (pet.level - 1) * perLevel
    const stars = 1.1 ** pet.star
    pet.baseRoll = {}
    for (const [key, n] of Object.entries(pet.combatAttributes)) {
      const unstarred = n / stars
      pet.baseRoll[key] = basicStats.has(key) ? unstarred / (1 + bonus) : Math.max(0, unstarred - bonus)
    }
  }
  const bonus = (level - 1) * perLevel
  const stars = 1.1 ** star
  const attributes: Pet['combatAttributes'] = {}
  for (const [key, base] of Object.entries(pet.baseRoll)) {
    const trained = basicStats.has(key) ? base * (1 + bonus) : base + bonus
    attributes[key] = Number((trained * stars).toFixed(6))
  }
  pet.combatAttributes = attributes
  pet.level = level
  pet.star = star
}
