// 属性映射配置
export const statNameMapping = {
  // 基础属性
  health: '生命值',
  maxHealth: '生命上限',
  attack: '攻击力',
  defense: '防御力',
  speed: '速度',
  // 战斗属性
  critRate: '暴击率',
  comboRate: '连击率',
  counterRate: '反击率',
  stunRate: '眩晕率',
  dodgeRate: '闪避率',
  vampireRate: '吸血率',
  // 战斗抗性
  critResist: '抗暴击',
  comboResist: '抗连击',
  counterResist: '抗反击',
  stunResist: '抗眩晕',
  dodgeResist: '抗闪避',
  vampireResist: '抗吸血',
  // 特殊属性
  healBoost: '强化治疗',
  critDamageBoost: '强化爆伤',
  critDamageReduce: '弱化爆伤',
  finalDamageBoost: '最终增伤',
  finalDamageReduce: '最终减伤',
  combatBoost: '战斗属性提升',
  resistanceBoost: '战斗抗性提升',
  // 其他属性
  cultivationRate: '修炼速率',
  spiritRate: '灵力获取',
  luck: '福缘'
}
// 获取属性的中文名称
export function getStatName (stat) {
  return statNameMapping[stat] || stat
}
// 格式化属性值（处理百分比和数值）
export function formatStatValue (stat, value) {
  // 处理null或undefined值
  if (value === null || value === undefined) {
    return '0'
  }
  // 这些属性需要显示为百分比
  const percentageStats = [
    'critRate', 'comboRate', 'counterRate', 'stunRate', 'dodgeRate', 'vampireRate',
    'critResist', 'comboResist', 'counterResist', 'stunResist', 'dodgeResist', 'vampireResist',
    'healBoost', 'critDamageBoost', 'critDamageReduce', 'finalDamageBoost', 'finalDamageReduce',
    'combatBoost', 'resistanceBoost', 'cultivationRate', 'spiritRate', 'luck'
  ]
  if (percentageStats.includes(stat)) {
    return `${(value * 100).toFixed(1)}%`
  }
  return value.toFixed(1)
}