// 境界名称配置
// prettier-ignore
const realms = [
  // 练气期
  { name: '练气一重', maxCultivation: 25 }, { name: '练气二重', maxCultivation: 61 },
  { name: '练气三重', maxCultivation: 92 }, { name: '练气四重', maxCultivation: 122 },
  { name: '练气五重', maxCultivation: 268 }, { name: '练气六重', maxCultivation: 294 },
  { name: '练气七重', maxCultivation: 700 }, { name: '练气八重', maxCultivation: 800 },
  { name: '练气九重', maxCultivation: 900 },
  // 筑基期
  { name: '筑基一重', maxCultivation: 1000 }, { name: '筑基二重', maxCultivation: 1200 },
  { name: '筑基三重', maxCultivation: 1400 }, { name: '筑基四重', maxCultivation: 1600 },
  { name: '筑基五重', maxCultivation: 1800 }, { name: '筑基六重', maxCultivation: 2000 },
  { name: '筑基七重', maxCultivation: 2200 }, { name: '筑基八重', maxCultivation: 2400 },
  { name: '筑基九重', maxCultivation: 2600 },
  // 金丹期
  { name: '金丹一重', maxCultivation: 3000 }, { name: '金丹二重', maxCultivation: 3500 },
  { name: '金丹三重', maxCultivation: 4000 }, { name: '金丹四重', maxCultivation: 4500 },
  { name: '金丹五重', maxCultivation: 5000 }, { name: '金丹六重', maxCultivation: 5500 },
  { name: '金丹七重', maxCultivation: 6000 }, { name: '金丹八重', maxCultivation: 6500 },
  { name: '金丹九重', maxCultivation: 7000 },
  // 元婴期
  { name: '元婴一重', maxCultivation: 8000 }, { name: '元婴二重', maxCultivation: 9000 },
  { name: '元婴三重', maxCultivation: 10000 }, { name: '元婴四重', maxCultivation: 11000 },
  { name: '元婴五重', maxCultivation: 12000 }, { name: '元婴六重', maxCultivation: 13000 },
  { name: '元婴七重', maxCultivation: 14000 }, { name: '元婴八重', maxCultivation: 15000 },
  { name: '元婴九重', maxCultivation: 16000 },
  // 化神期
  { name: '化神一重', maxCultivation: 18000 }, { name: '化神二重', maxCultivation: 20000 },
  { name: '化神三重', maxCultivation: 22000 }, { name: '化神四重', maxCultivation: 24000 },
  { name: '化神五重', maxCultivation: 26000 }, { name: '化神六重', maxCultivation: 28000 },
  { name: '化神七重', maxCultivation: 30000 }, { name: '化神八重', maxCultivation: 32000 },
  { name: '化神九重', maxCultivation: 35000 },
  // 返虚期
  { name: '返虚一重', maxCultivation: 40000 }, { name: '返虚二重', maxCultivation: 45000 },
  { name: '返虚三重', maxCultivation: 50000 }, { name: '返虚四重', maxCultivation: 55000 },
  { name: '返虚五重', maxCultivation: 60000 }, { name: '返虚六重', maxCultivation: 65000 },
  { name: '返虚七重', maxCultivation: 70000 }, { name: '返虚八重', maxCultivation: 75000 },
  { name: '返虚九重', maxCultivation: 80000 },
  // 合体期
  { name: '合体一重', maxCultivation: 90000 }, { name: '合体二重', maxCultivation: 100000 },
  { name: '合体三重', maxCultivation: 110000 }, { name: '合体四重', maxCultivation: 120000 },
  { name: '合体五重', maxCultivation: 130000 }, { name: '合体六重', maxCultivation: 140000 },
  { name: '合体七重', maxCultivation: 150000 }, { name: '合体八重', maxCultivation: 160000 },
  { name: '合体九重', maxCultivation: 170000 },
  // 大乘期
  { name: '大乘一重', maxCultivation: 200000 }, { name: '大乘二重', maxCultivation: 230000 },
  { name: '大乘三重', maxCultivation: 260000 }, { name: '大乘四重', maxCultivation: 290000 },
  { name: '大乘五重', maxCultivation: 320000 }, { name: '大乘六重', maxCultivation: 350000 },
  { name: '大乘七重', maxCultivation: 380000 }, { name: '大乘八重', maxCultivation: 410000 },
  { name: '大乘九重', maxCultivation: 450000 },
  // 渡劫期
  { name: '渡劫一重', maxCultivation: 500000 }, { name: '渡劫二重', maxCultivation: 550000 },
  { name: '渡劫三重', maxCultivation: 600000 }, { name: '渡劫四重', maxCultivation: 650000 },
  { name: '渡劫五重', maxCultivation: 700000 }, { name: '渡劫六重', maxCultivation: 750000 },
  { name: '渡劫七重', maxCultivation: 800000 }, { name: '渡劫八重', maxCultivation: 850000 },
  { name: '渡劫九重', maxCultivation: 900000 },
  // 仙人境
  { name: '仙人一重', maxCultivation: 1000000 }, { name: '仙人二重', maxCultivation: 1200000 },
  { name: '仙人三重', maxCultivation: 1400000 }, { name: '仙人四重', maxCultivation: 1600000 },
  { name: '仙人五重', maxCultivation: 1800000 }, { name: '仙人六重', maxCultivation: 2000000 },
  { name: '仙人七重', maxCultivation: 2200000 }, { name: '仙人八重', maxCultivation: 2400000 },
  { name: '仙人九重', maxCultivation: 2600000 },
  // 真仙境
  { name: '真仙一重', maxCultivation: 3000000 }, { name: '真仙二重', maxCultivation: 3500000 },
  { name: '真仙三重', maxCultivation: 4000000 }, { name: '真仙四重', maxCultivation: 4500000 },
  { name: '真仙五重', maxCultivation: 5000000 }, { name: '真仙六重', maxCultivation: 5500000 },
  { name: '真仙七重', maxCultivation: 6000000 }, { name: '真仙八重', maxCultivation: 6500000 },
  { name: '真仙九重', maxCultivation: 7000000 },
  // 金仙境
  { name: '金仙一重', maxCultivation: 8000000 }, { name: '金仙二重', maxCultivation: 9000000 },
  { name: '金仙三重', maxCultivation: 10000000 }, { name: '金仙四重', maxCultivation: 11000000 },
  { name: '金仙五重', maxCultivation: 12000000 }, { name: '金仙六重', maxCultivation: 13000000 },
  { name: '金仙七重', maxCultivation: 14000000 }, { name: '金仙八重', maxCultivation: 15000000 },
  { name: '金仙九重', maxCultivation: 16000000 },
  // 太乙境
  { name: '太乙一重', maxCultivation: 20000000 }, { name: '太乙二重', maxCultivation: 24000000 },
  { name: '太乙三重', maxCultivation: 28000000 }, { name: '太乙四重', maxCultivation: 32000000 },
  { name: '太乙五重', maxCultivation: 36000000 }, { name: '太乙六重', maxCultivation: 40000000 },
  { name: '太乙七重', maxCultivation: 44000000 }, { name: '太乙八重', maxCultivation: 48000000 },
  { name: '太乙九重', maxCultivation: 52000000 },
  // 大罗境
  { name: '大罗一重', maxCultivation: 60000000 }, { name: '大罗二重', maxCultivation: 70000000 },
  { name: '大罗三重', maxCultivation: 80000000 }, { name: '大罗四重', maxCultivation: 90000000 },
  { name: '大罗五重', maxCultivation: 100000000 }, { name: '大罗六重', maxCultivation: 110000000 },
  { name: '大罗七重', maxCultivation: 120000000 }, { name: '大罗八重', maxCultivation: 130000000 },
  { name: '大罗九重', maxCultivation: 140000000 }
]

export function realmGrowth(level: number, progress = 0) {
  const completed = level - 1
  const breakthroughs = completed + 3 * Math.floor(completed / 9)
  // Keep the training earned in completed realms when cultivation resets at breakthrough.
  const training = completed + (level < realms.length ? Math.max(0, Math.min(1, progress)) : 0)
  return {
    attack: training + 3 * breakthroughs,
    defense: training + 2 * breakthroughs,
    health: 5 * training + 20 * breakthroughs
  }
}

// 获取境界名称
export const getRealmName = (level: number) => {
  if (!Number.isInteger(level) || level < 1 || level > realms.length) throw new RangeError('无效的境界等级')
  return realms[level - 1]
}

export const getRealmLength = () => {
  return realms.length
}
