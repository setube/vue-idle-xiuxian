const creatures = new Set('野狼 恶狼 幽冥狼 冰狼 九尾天狐 睚眦 猛虎 赤焰虎 紫电豹 烈风豹 太古神虎 白虎 穷奇 狴犴 云豹 灵猫 狂狮 狻犴 饕餮 梼杌 麒麟 囚牛 黑熊 金刚猿 混沌巨兽 混沌 毒蛇 巨蟒 玄冰蟒 远古天蟒 万年龙蟒 幽冥魔龙 碧水蛟 青龙 应龙 嘲风 蒲牢 负屃 雷霆鹰 玄天冰凤 不死火凤 朱雀 火凤凰 雷鹰 风隼 玄武 霸下 玄龟 岩龟 地甲 草兔 火鼠 幻蝶 螭吻'.split(' '))

export function creatureArt(name?: string) {
  if (name === '山猪') return '/mountain-boar.svg'
  return name && creatures.has(name) ? '/art/' + name + '.svg' : undefined
}

const relics = new Set(['village-bamboo-sword', 'foundation-weapon', 'foundation-body', 'foundation-necklace'])
export function equipmentArt(id?: string | number) {
  return typeof id === 'string' && relics.has(id) ? '/art/' + id + '.svg' : undefined
}
