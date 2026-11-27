import type { PlayerState } from '../types/player'

export const starterSwordId = 'village-bamboo-sword'

export function starterDestination(player: PlayerState) {
  if (player.isNewPlayer) return '/'
  if (player.journeyStage === 'village') return '/exploration'
  if (player.journeyStage !== 'trial') return null
  if (!player.equippedArtifacts.weapon && player.items.some(item => item.id === starterSwordId)) return '/character'
  return '/dungeon'
}
