import { CombatManager, CombatType, CombatEntity } from "../src/plugins/combat"
import { petTrait, type PetTrait } from "../src/plugins/pet-growth"
import { normalizePlayerData } from "../src/stores/save"
import { beforeEach, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '../src/stores/player'
import { battlePoints, petRoster, projectedChanges } from '../src/plugins/companion-ranking'
import type { Pet } from '../src/types/game'

beforeEach(() => { setActivePinia(createPinia()) })
function pet(id: string, attack = 10, extra: Partial<Pet> = {}): Pet {
  return { id, name: '草兔', type: 'pet', rarity: 'mortal', level: 1, star: 0,
    combatAttributes: { attack, defense: 2, health: 10, speed: 1 }, ...extra }
}

test('draw and release split the original reward and a quote only settles once', () => {
  const player = usePlayerStore()
  const family = [pet('a', 30), pet('b', 25), pet('c')]
  for (const p of family) player.receiveDrawnPet(p)
  expect(player.petEssence).toBe(6)
  expect([...player.classifyPets().surplus]).toEqual(['c'])
  const quote = player.quotePetRelease([family[2]])
  expect(quote.essence).toBe(3)
  expect(player.releasePets(quote).success).toBe(true)
  expect(player.releasePets(quote).success).toBe(false)
  expect(player.petEssence).toBe(9)
})

test('a changed line-up invalidates a batch, and deployed or trained pets remain protected', () => {
  const p = usePlayerStore()
  const pets = [pet('a', 40), pet('b', 30), pet('c'), pet('trained', 1, { level: 2 })]
  pets.forEach(x => p.receiveDrawnPet(x))
  const quote = p.quotePetRelease([pets[2]])
  p.deployPet(pets[2])
  expect(p.releasePets(quote).success).toBe(false)
  expect(p.releasePets(quote, false).success).toBe(false)
  expect(p.classifyPets().surplus.has('trained')).toBe(false)
  const pair = petRoster([pets[0], pets[1]], 'a')
  expect([...pair.evolvable]).toEqual(['a'])
})

test('projected pet changes match deployment, include penalties and respect chance caps', () => {
  const p = usePlayerStore()
  const a = pet('a', 20), b = pet('b', 12)
  a.combatAttributes.critRate = 0.96
  b.combatAttributes.critRate = 1.4
  p.items.push(a,b); p.deployPet(a)
  const attack = p.effectiveBaseAttributes.attack, crit = p.effectiveCombatAttributes.critRate
  const diff = projectedChanges(p, p.effectBonuses, b.combatAttributes, a.combatAttributes)
  p.deployPet(b)
  expect(diff.attack).toBe(p.effectiveBaseAttributes.attack - attack)
  expect(diff.critRate ?? 0).toBeCloseTo(p.effectiveCombatAttributes.critRate - crit)
  expect(battlePoints({ spiritRate: 1, cultivationRate: 2 })).toBe(0)
})

test('evolution increases actual deployed stats and recalling removes the whole new bonus', () => {
  const p = usePlayerStore(), a = pet('a'), b = pet('b')
  p.items.push(a,b)
  const before = p.effectiveBaseAttributes.attack
  p.deployPet(a)
  expect(p.evolvePet(a,b).success).toBe(true)
  expect(a.star).toBe(1)
  expect(p.effectiveBaseAttributes.attack).toBe(before + 11)
  p.recallPet()
  expect(p.effectiveBaseAttributes.attack).toBe(before)
})

test('cross-species star progress survives saving, carries over, and protects partial training', () => {
  const p = usePlayerStore(), main = pet('main'), first = pet('cat', 12, { name: '灵猫' }), same = pet('copy')
  p.items.push(main, first, same)
  p.deployPet(main)
  expect(p.evolvePet(main, first).success).toBe(true)
  expect([main.star, main.starProgress]).toEqual([0,1])
  expect(p.classifyPets().surplus.has(main.id)).toBe(false)
  const saved = normalizePlayerData(JSON.parse(JSON.stringify(p.$state)), p.$state)
  expect((saved.items.find(i => i.id === main.id) as Pet).starProgress).toBe(1)
  expect(p.evolvePet(main, same).success).toBe(true)
  expect([main.star, main.starProgress]).toEqual([1,1])
  expect(p.evolvePet(main, same).success).toBe(false)
  expect(p.evolvePet(main, main).success).toBe(false)
})

test('inheritance conserves essence across active pets, transfers back exactly, and preserves stars', () => {
  const p = usePlayerStore(), a = pet('a'), b = pet('b', 40, { star: 1, starProgress: 2 })
  p.items.push(a,b)
  p.petEssence = 120
  p.deployPet(a)
  const before = p.effectiveBaseAttributes.attack
  for (let n = 0; n < 4; n++) p.upgradePet(a)
  p.upgradePet(b)
  expect(p.transferPetTraining(a.id,b.id).success).toBe(true)
  expect([a.level,b.level,b.star,b.starProgress,p.petEssence]).toEqual([1,5,1,2,20])
  expect(p.effectiveBaseAttributes.attack).toBe(before)
  expect(p.transferPetTraining(a.id,b.id).success).toBe(false)
  expect(p.transferPetTraining(b.id,a.id).success).toBe(true)
  expect([a.level,b.level,b.combatAttributes.attack]).toEqual([5,1,40])
  expect(p.transferPetTraining(a.id,a.id).success).toBe(false)
  const saved = normalizePlayerData(JSON.parse(JSON.stringify(p.$state)),p.$state)
  expect((saved.items.find(i => i.id === a.id) as Pet).baseRoll).toEqual(a.baseRoll)
})

test('feeding trained materials carries progress and refunds invested essence once', () => {
  const p = usePlayerStore(), a = pet('a'), food = pet('b', 15, { name: '火鼠', level: 5, star: 2, starProgress: 1 })
  const other = pet('c',10,{rarity:'divine'})
  p.items.push(a,food,other)
  p.deployPet(food)
  expect(p.evolvePet(a,food).success).toBe(false)
  p.recallPet()
  expect(p.evolvePet(a,other).success).toBe(false)
  expect(p.evolvePet(a,food).success).toBe(true)
  expect([a.star,a.starProgress,p.petEssence]).toEqual([2,2,100])
  expect(p.evolvePet(a,food).success).toBe(false)
})

test('pet traits affect initiative, the first landed hit, and damage in long fights', () => {
  const make = (trait?: PetTrait) => {
    const unit = (name: string, speed: number) => new CombatEntity(name,1,{ speed,health:2000,damage:20,defense:10 })
    const manager = new CombatManager(unit('修士',1),unit('山猪',20),CombatType.NORMAL,trait)
    manager.start()
    return manager
  }
  const random = Math.random
  Math.random = () => 0.99
  try {
    const swift = make(petTrait('风隼'))
    expect(swift.executeTurn()!.results[0].playerAttack).toBe(true)
    expect(swift.executeTurn()!.results[0].playerAttack).toBe(false)
    const guard = make(petTrait('玄龟'))
    guard.player.stats.dodgeRate = 1
    expect(guard.executeTurn()!.results[0].isDodged).toBe(true)
    guard.player.stats.dodgeRate = 0
    const reduced = guard.executeTurn()!.results[0].damage
    expect(reduced).toBeCloseTo(guard.executeTurn()!.results[0].damage * 0.65)
    const pursuit = make(petTrait('白虎'))
    const hit = () => pursuit.executeTurn()!.results.find(h => h.playerAttack)!.damage
    const first = hit()
    expect(hit()).toBeCloseTo(first)
    expect(hit()).toBeCloseTo(first * 1.2)
  } finally { Math.random = random }
})
