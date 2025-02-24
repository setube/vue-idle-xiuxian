// 副本增益效果管理器
const dungeonBuffs = {
  // 存储当前应用的增益效果
  activeBuffs: [],

  // 应用增益效果
  apply (player, option) {
    // 添加到活跃增益列表
    this.activeBuffs.push({
      id: option.id,
      name: option.name,
      effect: option.effect
    })

    // 应用效果
    if (typeof option.effect === 'function') {
      option.effect(player)
    }
  },

  // 清除所有增益效果
  clear (player) {
    // 重置可能被修改的属性
    if (player.baseAttributes) {
      player.baseAttributes.attack = player.baseAttributes.attack || 10
      player.baseAttributes.defense = player.baseAttributes.defense || 5
      player.baseAttributes.speed = player.baseAttributes.speed || 10
      player.baseAttributes.health = player.baseAttributes.health || 100
    }

    if (player.combatAttributes) {
      player.combatAttributes.critRate = player.combatAttributes.critRate || 0.05
      player.combatAttributes.comboRate = player.combatAttributes.comboRate || 0
      player.combatAttributes.counterRate = player.combatAttributes.counterRate || 0
      player.combatAttributes.stunRate = player.combatAttributes.stunRate || 0
      player.combatAttributes.dodgeRate = player.combatAttributes.dodgeRate || 0
      player.combatAttributes.vampireRate = player.combatAttributes.vampireRate || 0
    }

    if (player.specialAttributes) {
      player.specialAttributes.healBoost = player.specialAttributes.healBoost || 0
      player.specialAttributes.critDamageBoost = player.specialAttributes.critDamageBoost || 0
      player.specialAttributes.critDamageReduce = player.specialAttributes.critDamageReduce || 0
      player.specialAttributes.finalDamageBoost = player.specialAttributes.finalDamageBoost || 0
      player.specialAttributes.finalDamageReduce = player.specialAttributes.finalDamageReduce || 0
      player.specialAttributes.combatBoost = player.specialAttributes.combatBoost || 0
      player.specialAttributes.resistanceBoost = player.specialAttributes.resistanceBoost || 0
    }

    // 清空活跃增益列表
    this.activeBuffs = []
  },

  // 获取当前活跃的增益效果
  getActiveBuffs () {
    return this.activeBuffs
  }
}

export default dungeonBuffs