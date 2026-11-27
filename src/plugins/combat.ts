import type { PetTrait } from './pet-growth'
import type { Stats } from '../types/game'

export interface CombatEffect { id: string; apply: (entity: CombatEntity) => void; remove: (entity: CombatEntity) => void }
export interface DamageResult { damage: number; isCrit: boolean; isCombo: boolean; isVampire: boolean; isStun: boolean }
export interface DamageTaken { dodged: boolean; damage: number; currentHealth?: number; isDead?: boolean; isCounter?: boolean }
interface CombatHit { playerAttack: boolean; attacker: string; defender: string; damage: number; isCrit: boolean; isCombo: boolean; isDodged: boolean }

// 战斗状态
const CombatState = {
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
} as const
type CombatStateValue = typeof CombatState[keyof typeof CombatState]

// 战斗类型
const CombatType = {
  NORMAL: 'normal', // 普通战斗
  BOSS: 'boss', // Boss战斗
  ELITE: 'elite' // 精英战斗
} as const
type CombatTypeValue = typeof CombatType[keyof typeof CombatType]

// 基础战斗属性
class CombatStats {
  health: number
  maxHealth: number
  damage: number
  defense: number
  speed: number
  critRate: number
  comboRate: number
  counterRate: number
  stunRate: number
  dodgeRate: number
  vampireRate: number
  critResist: number
  comboResist: number
  counterResist: number
  stunResist: number
  dodgeResist: number
  vampireResist: number
  healBoost: number
  critDamageBoost: number
  critDamageReduce: number
  finalDamageBoost: number
  finalDamageReduce: number
  combatBoost: number
  resistanceBoost: number
  autoHeal: number
  constructor(base: Stats = {}) {
    // 基础属性
    this.autoHeal = base.autoHeal || 0
    this.health = base.health || 100
    this.maxHealth = base.maxHealth || 100
    this.damage = base.damage || 10
    this.defense = base.defense || 5
    this.speed = base.speed || 10
    // 战斗属性（百分比）
    this.critRate = base.critRate || 0.05 // 暴击率
    this.comboRate = base.comboRate || 0 // 连击率
    this.counterRate = base.counterRate || 0 // 反击率
    this.stunRate = base.stunRate || 0 // 眩晕率
    this.dodgeRate = base.dodgeRate || 0.05 // 闪避率
    this.vampireRate = base.vampireRate || 0 // 吸血率
    // 战斗抗性（百分比）
    this.critResist = base.critResist || 0 // 抗暴击
    this.comboResist = base.comboResist || 0 // 抗连击
    this.counterResist = base.counterResist || 0 // 抗反击
    this.stunResist = base.stunResist || 0 // 抗眩晕
    this.dodgeResist = base.dodgeResist || 0 // 抗闪避
    this.vampireResist = base.vampireResist || 0 // 抗吸血
    // 特殊属性（百分比）
    this.healBoost = base.healBoost || 0 // 强化治疗
    this.critDamageBoost = base.critDamageBoost || 0.5 // 强化爆伤
    this.critDamageReduce = base.critDamageReduce || 0 // 弱化爆伤
    this.finalDamageBoost = base.finalDamageBoost || 0 // 最终增伤
    this.finalDamageReduce = base.finalDamageReduce || 0 // 最终减伤
    this.combatBoost = base.combatBoost || 0 // 战斗属性提升
    this.resistanceBoost = base.resistanceBoost || 0 // 战斗抗性提升
  }
  // 计算最终伤害
  calculateDamage(target?: CombatEntity): DamageResult {
    // 应用战斗属性提升
    let damage = Math.abs(this.damage * (1 + this.combatBoost))
    let isCrit = false
    let isCombo = false
    let isVampire = false
    let isStun = false
    // 计算暴击（考虑目标的抗暴击）
    const finalCritRate = Math.max(
      0,
      this.critRate * (1 + this.combatBoost) -
        (target ? target.stats.critResist * (1 + target.stats.resistanceBoost) : 0)
    )
    if (Math.random() < finalCritRate) {
      damage *= 1.5 + this.critDamageBoost
      isCrit = true
    }
    // 计算连击（考虑目标的抗连击）
    const finalComboRate = Math.max(
      0,
      this.comboRate * (1 + this.combatBoost) - (target ? target.stats.comboResist : 0)
    )
    if (Math.random() < finalComboRate) {
      damage *= 1.3
      isCombo = true
    }
    // 计算吸血（考虑目标的抗吸血）
    const finalVampireRate = Math.max(
      0,
      this.vampireRate * (1 + this.combatBoost) - (target ? target.stats.vampireResist : 0)
    )
    if (Math.random() < finalVampireRate) {
      isVampire = true
    }
    // 计算眩晕（考虑目标的抗眩晕）
    const finalStunRate = Math.max(0, this.stunRate * (1 + this.combatBoost) - (target ? target.stats.stunResist : 0))
    if (Math.random() < finalStunRate) {
      isStun = true
    }
    // 应用最终伤害加成
    damage *= 1 + this.finalDamageBoost
    return { damage: Math.abs(damage), isCrit, isCombo, isVampire, isStun }
  }
  // 计算伤害减免
  calculateDamageReduction(incomingDamage: number, attackerStats?: Partial<DamageResult>) {
    let damage = Math.abs(incomingDamage)
    // 应用防御减伤（考虑战斗属性提升）
    const effectiveDefense = this.defense * (1 + this.combatBoost)
    damage *= 100 / (100 + effectiveDefense)
    // 如果是暴击伤害，应用暴击伤害减免
    if (attackerStats && attackerStats.isCrit) {
      damage *= 1 - this.critDamageReduce
    }
    // 应用最终伤害减免
    damage *= 1 - this.finalDamageReduce
    return Math.abs(damage)
  }
}

// 战斗实体基类
class CombatEntity {
  name: string
  level: number
  realm: string
  stats: CombatStats
  currentHealth: number
  effects: CombatEffect[]
  constructor(name: string, level: number, baseStats: Stats = {}, realm = '练气一层') {
    const stats = { ...baseStats }
    this.name = name
    this.level = level
    this.realm = realm
    // 确保maxHealth与health保持一致
    if (stats.health && !stats.maxHealth) {
      stats.maxHealth = stats.health
    }
    this.stats = new CombatStats(stats)
    this.currentHealth = this.stats.maxHealth
    this.effects = []
  }
  // 受到伤害
  takeDamage(amount: number, source?: CombatEntity, isCrit = false): DamageTaken {
    // 计算实际闪避率（考虑攻击方的抗闪避）
    const actualDodgeRate = Math.max(0, Math.min(1, this.stats.dodgeRate - (source ? source.stats.dodgeResist : 0)))
    // 闪避判定
    if (Math.random() < actualDodgeRate) {
      return { dodged: true, damage: 0 }
    }
    // 计算实际伤害
    const reducedDamage = this.stats.calculateDamageReduction(amount, { isCrit })
    this.currentHealth = Math.max(0, this.currentHealth - reducedDamage)
    // 计算反击（考虑攻击方的抗反击）
    let isCounter = false
    if (source) {
      const finalCounterRate = Math.max(0, this.stats.counterRate - source.stats.counterResist)
      if (Math.random() < finalCounterRate) {
        isCounter = true
      }
    }
    return {
      dodged: false,
      damage: reducedDamage,
      currentHealth: this.currentHealth,
      isDead: this.currentHealth <= 0,
      isCounter: isCounter
    }
  }
  // 恢复生命值
  heal(amount: number) {
    const oldHealth = this.currentHealth
    this.currentHealth = Math.min(this.stats.maxHealth, this.currentHealth + amount)
    return this.currentHealth - oldHealth
  }
  // 添加效果
  addEffect(effect: CombatEffect) {
    this.effects.push(effect)
    effect.apply(this)
  }
  // 移除效果
  removeEffect(effectId: string) {
    const index = this.effects.findIndex(e => e.id === effectId)
    if (index >= 0) {
      const effect = this.effects[index]
      effect.remove(this)
      this.effects.splice(index, 1)
    }
  }
}
// 战斗管理器
class CombatManager {
  player: CombatEntity
  enemy: CombatEntity
  type: CombatTypeValue
  state: CombatStateValue
  round: number
  maxRounds: number
  log: string[]
  guardUsed = false
  constructor(player: CombatEntity, enemy: CombatEntity, type: CombatTypeValue = CombatType.NORMAL, readonly trait?: PetTrait) {
    this.player = player
    this.enemy = enemy
    this.type = type
    this.state = CombatState.READY
    this.round = 0
    this.maxRounds = 10 // 设置最大回合数为10
    this.log = []
  }
  // 开始战斗
  start() {
    this.state = CombatState.IN_PROGRESS
    return this.state
  }
  // 执行回合
  executeTurn(): { results: CombatHit[]; state: CombatStateValue } | null {
    if (this.state !== CombatState.IN_PROGRESS) return null
    this.round++
    // 检查是否超过最大回合数
    if (this.round > this.maxRounds) {
      this.state = CombatState.DEFEAT
      this.log.push(`战斗超过${this.maxRounds}回合，战斗失败！`)
      return { results: [], state: this.state }
    }
    const results: CombatHit[] = []
    for (const entity of [this.player, this.enemy]) {
      if (entity.stats.autoHeal > 0) {
        const restored = entity.heal(entity.stats.maxHealth * entity.stats.autoHeal)
        if (restored > 0) this.log.push(entity.name + '恢复' + restored.toFixed(1) + '点生命值')
      }
    }
    // 根据速度决定攻击顺序
    const playerSpeed = this.player.stats.speed * (1 + this.player.stats.combatBoost)
    const enemySpeed = this.enemy.stats.speed * (1 + this.enemy.stats.combatBoost)
    const initiative = this.round === 1 && this.trait === 'initiative'
    if (initiative) this.log.push('灵宠先手：率先行动')
    if (this.round === 3 && this.trait === 'pursuit') this.log.push('灵宠追击：伤害提高 20%')
    const playerFirst = initiative || playerSpeed >= enemySpeed
    const firstAttacker = playerFirst ? this.player : this.enemy
    const secondAttacker = playerFirst ? this.enemy : this.player

    const strike = (attacker: CombatEntity, defender: CombatEntity, counter = false) => {
      const attack = attacker.stats.calculateDamage(defender)
      const guarded = defender === this.player && this.trait === 'guard' && !this.guardUsed
      const pursuit = attacker === this.player && this.trait === 'pursuit' && this.round >= 3
      const damage = attack.damage * (guarded ? 0.65 : 1) * (pursuit ? 1.2 : 1)
      const hit = defender.takeDamage(damage, attacker, attack.isCrit)
      if (guarded && !hit.dodged) {
        this.guardUsed = true
        this.log.push('灵宠护体：本次受击减伤 35%')
      }
      const verb = counter ? '反击' : '攻击'
      const effects = [attack.isCrit && '暴击', attack.isCombo && '连击', attack.isStun && '眩晕'].filter(Boolean)
      const suffix = effects.length ? '（' + effects.join('、') + '）' : ''
      this.log.push(hit.dodged ? attacker.name + verb + '被闪避' : attacker.name + verb + '造成' + hit.damage.toFixed(1) + '点伤害' + suffix)
      if (!hit.dodged && attack.isVampire) {
        const restored = attacker.heal(hit.damage * 0.3)
        this.log.push(attacker.name + '吸血恢复' + restored.toFixed(1) + '点生命值')
      }
      results.push({ playerAttack: attacker === this.player, attacker: attacker.name, defender: defender.name,
        damage: hit.damage, isCrit: attack.isCrit, isCombo: attack.isCombo, isDodged: hit.dodged })
      if (hit.isDead) {
        this.state = attacker === this.player ? CombatState.VICTORY : CombatState.DEFEAT
        this.log.push(attacker.name + '获得胜利！')
      }
      return { stunned: !hit.dodged && attack.isStun, counter: hit.isCounter }
    }
    for (const [attacker, defender] of [[firstAttacker, secondAttacker], [secondAttacker, firstAttacker]]) {
      const hit = strike(attacker, defender)
      if (this.state !== CombatState.IN_PROGRESS || hit.stunned) break
      if (hit.counter) {
        strike(defender, attacker, true)
        if (this.state !== CombatState.IN_PROGRESS) break
      }
    }
    return { results, state: this.state }
  }
  // 获取战斗日志
  getCombatLog() {
    return this.log
  }
}

// 生成敌人
function generateEnemy(level: number, type: CombatTypeValue = CombatType.NORMAL, difficulty = 1) {
  const baseStats: Stats = {
    // 基础属性
    health: 100 + difficulty * level * 200,
    damage: 8 + difficulty * level * 2,
    defense: 3 + difficulty * level * 2,
    speed: 5 + difficulty * level * 2,
    // 战斗属性（百分比）
    critRate: 0.05 + difficulty * level * 0.02,
    comboRate: 0.03 + difficulty * level * 0.02,
    counterRate: 0.03 + difficulty * level * 0.02,
    stunRate: 0.02 + difficulty * level * 0.01,
    dodgeRate: 0.05 + difficulty * level * 0.02,
    vampireRate: 0.02 + difficulty * level * 0.01,
    // 战斗抗性（百分比）
    critResist: 0.02 + difficulty * level * 0.01,
    comboResist: 0.02 + difficulty * level * 0.01,
    counterResist: 0.02 + difficulty * level * 0.01,
    stunResist: 0.02 + difficulty * level * 0.01,
    dodgeResist: 0.02 + difficulty * level * 0.01,
    vampireResist: 0.02 + difficulty * level * 0.01,
    // 特殊属性（百分比）
    healBoost: 0.05 + difficulty * level * 0.02,
    critDamageBoost: 0.2 + difficulty * level * 0.1,
    critDamageReduce: 0.1 + difficulty * level * 0.05,
    finalDamageBoost: 0.05 + difficulty * level * 0.02,
    finalDamageReduce: 0.05 + difficulty * level * 0.02,
    combatBoost: 0.03 + difficulty * level * 0.02,
    resistanceBoost: 0.03 + difficulty * level * 0.02
  }
  if (difficulty === 1 && level === 1 && type === CombatType.NORMAL) {
    baseStats.health = 70
    baseStats.damage = 7
    baseStats.defense = 3
  }
  // 根据类型调整属性
  switch (type) {
    case CombatType.ELITE:
      Object.keys(baseStats).forEach(key => {
        if (typeof baseStats[key] === 'number') {
          if (key.includes('Rate') || key.includes('Resist') || key.includes('Boost') || key.includes('Reduce')) {
            baseStats[key] = Math.min(0.8, baseStats[key] * 1.3) // 百分比属性最高限制在80%
          } else {
            baseStats[key] *= 1.5
          }
        }
      })
      break
    case CombatType.BOSS:
      Object.keys(baseStats).forEach(key => {
        if (typeof baseStats[key] === 'number') {
          if (key.includes('Rate') || key.includes('Resist') || key.includes('Boost') || key.includes('Reduce')) {
            baseStats[key] = Math.min(0.9, baseStats[key] * 1.5) // 百分比属性最高限制在90%
          } else {
            baseStats[key] *= 2
          }
        }
      })
      break
  }
  // 根据类型和等级生成敌人名称
  let enemyName = ''
  const normalNames = ['野狼', '山猪', '毒蛇', '黑熊', '猛虎', '恶狼', '巨蟒', '狂狮']
  const eliteNames = ['赤焰虎', '玄冰蟒', '紫电豹', '金刚猿', '幽冥狼', '碧水蛟', '雷霆鹰', '烈风豹']
  const bossNames = ['九尾天狐', '万年龙蟒', '太古神虎', '玄天冰凤', '幽冥魔龙', '混沌巨兽', '远古天蟒', '不死火凤']
  switch (type) {
    case CombatType.BOSS:
      enemyName = bossNames[Math.floor(level / 10) % bossNames.length]
      break
    case CombatType.ELITE:
      enemyName = eliteNames[Math.floor(level / 5) % eliteNames.length]
      break
    default:
      enemyName = normalNames[level % normalNames.length]
  }
  return new CombatEntity(enemyName, level, baseStats, '练气一层')
}
export { CombatState, CombatType, CombatStats, CombatEntity, CombatManager, generateEnemy }
