import type { CombatManager } from './combat'

export function describeBattle(combat: Pick<CombatManager, 'round' | 'maxRounds' | 'player' | 'enemy' | 'state'>): string {
  const { player, enemy } = combat
  const remaining = (health: number, max: number) => Math.ceil(100 * Math.min(1, Math.max(0, health / max)))
  if (combat.state === 'victory') {
    return `第 ${combat.round} 回合击败${enemy.name}，你还剩 ${remaining(player.currentHealth, player.stats.maxHealth)}% 气血。`
  }
  const reason = combat.round > combat.maxRounds
    ? `撑满 ${combat.maxRounds} 回合，时间耗尽`
    : `第 ${combat.round} 回合气血耗尽`
  return `${reason}。${enemy.name}还剩 ${remaining(enemy.currentHealth, enemy.stats.maxHealth)}% 气血。`
}

export interface BattleReport {
  difficulty: number
  floor: number
  won: boolean
  rounds: number
  enemyRemaining: number
  result: string
  settlement: string
}

export function recordBattle(history: BattleReport[], report: BattleReport): BattleReport[] {
  const previous = history.find(entry => entry.difficulty === report.difficulty && entry.floor === report.floor)
  const otherDifficulties = history.filter(entry => entry.difficulty !== report.difficulty)
  return [report, ...(previous ? [previous] : []), ...otherDifficulties]
}

export function compareBattles(current?: BattleReport, previous?: BattleReport): string {
  if (!current || !previous || current.difficulty !== previous.difficulty || current.floor !== previous.floor) return ''
  const outcome = current.won && !previous.won ? '这次已通关。' : ''
  return `上次 ${previous.rounds} 回合，敌方剩余气血 ${previous.enemyRemaining}%；本次 ${current.rounds} 回合，剩余 ${current.enemyRemaining}%。${outcome}`
}

export function highestFloorKey(difficulty: number) {
  switch (difficulty) {
    case 2: return 'dungeonHighestFloor_2'
    case 5: return 'dungeonHighestFloor_5'
    case 10: return 'dungeonHighestFloor_10'
    case 100: return 'dungeonHighestFloor_100'
    default: return 'dungeonHighestFloor'
  }
}
