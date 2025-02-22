<script setup>
import { usePlayerStore } from '../stores/player'
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'
import { formatNumberToChineseUnit } from '../plugins/utils'

const playerStore = usePlayerStore()
const message = useMessage()

// 抽卡类型
const gachaType = ref('all') // 'equipment'、'pet' 或 'all'

// 抽卡动画状态
const isShaking = ref(false)
const isOpening = ref(false)
const showResult = ref(false)
const gachaResult = ref(null)
const showProbabilityInfo = ref(false)
const isDrawing = ref(false)

// 结果弹窗相关
const currentPage = ref(1)
const pageSize = ref(12)
const selectedQuality = ref(null)
const filteredResults = ref([])

// 装备品质
const equipmentQualities = {
    common: { name: '凡品', color: '#9e9e9e', statMod: 1.0, realmRequirement: 1 },  // 练气期
    uncommon: { name: '下品', color: '#4caf50', statMod: 1.2, realmRequirement: 5 },  // 练气中期
    rare: { name: '中品', color: '#2196f3', statMod: 1.5, realmRequirement: 10 },  // 筑基期
    epic: { name: '上品', color: '#9c27b0', statMod: 2.0, realmRequirement: 19 },  // 金丹期
    legendary: { name: '极品', color: '#ff9800', statMod: 2.5, realmRequirement: 28 },  // 元婴期
    mythic: { name: '仙品', color: '#e91e63', statMod: 3.0, realmRequirement: 37 }  // 化神期
}

// 装备类型
const equipmentTypes = {
    weapon: { name: '武器', slot: 'weapon', prefixes: ['九天', '太虚', '混沌', '玄天', '紫霄', '青冥', '赤炎', '幽冥'] },
    head: { name: '头部', slot: 'head', prefixes: ['天灵', '玄冥', '紫金', '青玉', '赤霞', '幽月', '星辰', '云霄'] },
    body: { name: '衣服', slot: 'body', prefixes: ['九霄', '太素', '混元', '玄阳', '紫薇', '青龙', '赤凤', '幽冥'] },
    legs: { name: '裤子', slot: 'legs', prefixes: ['天罡', '玄武', '紫电', '青云', '赤阳', '幽灵', '星光', '云雾'] },
    feet: { name: '鞋子', slot: 'feet', prefixes: ['天行', '玄风', '紫霞', '青莲', '赤焰', '幽影', '星步', '云踪'] },
    shoulder: { name: '肩甲', slot: 'shoulder', prefixes: ['天护', '玄甲', '紫雷', '青锋', '赤羽', '幽岚', '星芒', '云甲'] },
    hands: { name: '手套', slot: 'hands', prefixes: ['天罗', '玄玉', '紫晶', '青钢', '赤金', '幽银', '星铁', '云纹'] },
    wrist: { name: '护腕', slot: 'wrist', prefixes: ['天绝', '玄铁', '紫玉', '青石', '赤铜', '幽钢', '星晶', '云纱'] },
    necklace: { name: '项链', slot: 'necklace', prefixes: ['天珠', '玄圣', '紫灵', '青魂', '赤心', '幽魄', '星魂', '云珠'] },
    ring1: { name: '戒指1', slot: 'ring1', prefixes: ['天命', '玄命', '紫命', '青命', '赤命', '幽命', '星命', '云命'] },
    ring2: { name: '戒指2', slot: 'ring2', prefixes: ['天道', '玄道', '紫道', '青道', '赤道', '幽道', '星道', '云道'] },
    belt: { name: '腰带', slot: 'belt', prefixes: ['天系', '玄系', '紫系', '青系', '赤系', '幽系', '星系', '云系'] },
    artifact: { name: '法宝', slot: 'artifact', prefixes: ['天宝', '玄宝', '紫宝', '青宝', '赤宝', '幽宝', '星宝', '云宝'] }
}

// 生成随机装备
const generateEquipment = (level, type = null, quality = null) => {
    // 随机选择装备类型
    if (!type) {
        const types = Object.keys(equipmentTypes)
        type = types[Math.floor(Math.random() * types.length)]
    }
    // 随机选择品质，根据玩家等级调整概率
    if (!quality) {
        const qualities = Object.keys(equipmentQualities)
        const levelBonus = Math.min(0.2, level * 0.01) // 每级增加1%的高品质概率，最高20%
        const roll = Math.random() - levelBonus
        if (roll < 0.35) quality = 'common'
        else if (roll < 0.65) quality = 'uncommon'
        else if (roll < 0.82) quality = 'rare'
        else if (roll < 0.93) quality = 'epic'
        else if (roll < 0.98) quality = 'legendary'
        else quality = 'mythic'
    }
    // 检查境界要求
    const requiredRealm = equipmentQualities[quality].realmRequirement
    // 基础属性计算
    const baseStats = {}
    const qualityMod = equipmentQualities[quality].statMod
    const levelMod = 1 + (level * 0.1)
    Object.entries(equipmentBaseStats[type]).forEach(([stat, config]) => {
        const base = config.min + Math.random() * (config.max - config.min)
        const value = base * qualityMod * levelMod
        // 对百分比属性进行特殊处理
        if (['critRate', 'critDamageBoost', 'dodgeRate', 'vampireRate', 'finalDamageBoost', 'finalDamageReduce'].includes(stat)) {
            baseStats[stat] = Math.round(value * 100) / 100 // 保留两位小数
        } else {
            baseStats[stat] = Math.round(value)
        }
    })
    return {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: generateEquipmentName(type, quality),
        type: type,  // 确保设置正确的type属性
        slot: type,  // 添加slot属性，用于装备系统
        quality,
        level,
        requiredRealm,
        stats: baseStats,
        qualityInfo: equipmentQualities[quality]
    }
}
// 生成装备名称
const generateEquipmentName = (type, quality) => {
    const typeInfo = equipmentTypes[type]
    const qualityInfo = equipmentQualities[quality]
    const prefix = typeInfo.prefixes[Math.floor(Math.random() * typeInfo.prefixes.length)]
    const suffixes = ['', '·真', '·极', '·道', '·天', '·仙', '·圣', '·神']
    const suffix = quality === 'mythic' ? suffixes[7] :
        quality === 'legendary' ? suffixes[6] :
            quality === 'epic' ? suffixes[5] :
                quality === 'rare' ? suffixes[4] :
                    quality === 'uncommon' ? suffixes[3] :
                        suffixes[0]
    return `${prefix}${typeInfo.name}${suffix}`
}

// 装备基础属性
const equipmentBaseStats = {
    weapon: {
        attack: { name: '攻击', min: 10, max: 20 },
        critRate: { name: '暴击率', min: 0.05, max: 0.1 },
        critDamageBoost: { name: '暴击伤害', min: 0.1, max: 0.3 }
    },
    head: {
        defense: { name: '防御', min: 5, max: 10 },
        health: { name: '生命', min: 50, max: 100 },
        stunResist: { name: '抗眩晕', min: 0.05, max: 0.1 }
    },
    body: {
        defense: { name: '防御', min: 8, max: 15 },
        health: { name: '生命', min: 80, max: 150 },
        finalDamageReduce: { name: '最终减伤', min: 0.05, max: 0.1 }
    },
    legs: {
        defense: { name: '防御', min: 6, max: 12 },
        speed: { name: '速度', min: 5, max: 10 },
        dodgeRate: { name: '闪避率', min: 0.05, max: 0.1 }
    },
    feet: {
        defense: { name: '防御', min: 4, max: 8 },
        speed: { name: '速度', min: 8, max: 15 },
        dodgeRate: { name: '闪避率', min: 0.05, max: 0.1 }
    },
    shoulder: {
        defense: { name: '防御', min: 5, max: 10 },
        health: { name: '生命', min: 40, max: 80 },
        counterRate: { name: '反击率', min: 0.05, max: 0.1 }
    },
    hands: {
        attack: { name: '攻击', min: 5, max: 10 },
        critRate: { name: '暴击率', min: 0.03, max: 0.08 },
        comboRate: { name: '连击率', min: 0.05, max: 0.1 }
    },
    wrist: {
        defense: { name: '防御', min: 3, max: 8 },
        counterRate: { name: '反击率', min: 0.05, max: 0.1 },
        vampireRate: { name: '吸血率', min: 0.05, max: 0.1 }
    },
    necklace: {
        health: { name: '生命', min: 60, max: 120 },
        healBoost: { name: '强化治疗', min: 0.1, max: 0.2 },
        spiritRate: { name: '灵力获取', min: 0.1, max: 0.2 }
    },
    ring1: {
        attack: { name: '攻击', min: 5, max: 10 },
        critDamageBoost: { name: '暴击伤害', min: 0.1, max: 0.2 },
        finalDamageBoost: { name: '最终增伤', min: 0.05, max: 0.1 }
    },
    ring2: {
        defense: { name: '防御', min: 5, max: 10 },
        critDamageReduce: { name: '爆伤减免', min: 0.1, max: 0.2 },
        resistanceBoost: { name: '抗性提升', min: 0.05, max: 0.1 }
    },
    belt: {
        health: { name: '生命', min: 40, max: 80 },
        defense: { name: '防御', min: 4, max: 8 },
        combatBoost: { name: '战斗属性', min: 0.05, max: 0.1 }
    },
    artifact: {
        cultivationRate: { name: '修炼速率', min: 0.1, max: 0.3 },
        spiritRate: { name: '灵力获取', min: 0.1, max: 0.3 },
        luck: { name: '福缘', min: 0.1, max: 0.3 }
    }
}

// 灵宠品质配置
const petRarities = {
    divine: {
        name: '神品',
        color: '#FF0000',
        probability: 0.002,
        essenceBonus: 50
    },
    celestial: {
        name: '仙品',
        color: '#FFD700',
        probability: 0.0581,
        essenceBonus: 30
    },
    mystic: {
        name: '玄品',
        color: '#9932CC',
        probability: 0.1601,
        essenceBonus: 20
    },
    spiritual: {
        name: '灵品',
        color: '#1E90FF',
        probability: 0.2801,
        essenceBonus: 10
    },
    mortal: {
        name: '凡品',
        color: '#32CD32',
        probability: 0.4997,
        essenceBonus: 5
    }
}

// 灵宠池配置
const petPool = {
    divine: [
        { name: '玄武', description: '北方守护神兽' },
        { name: '白虎', description: '西方守护神兽' },
        { name: '朱雀', description: '南方守护神兽' },
        { name: '青龙', description: '东方守护神兽' },
        { name: '应龙', description: '上古神龙，掌控风雨' },
        { name: '麒麟', description: '祥瑞之兽，通晓万物' },
        { name: '饕餮', description: '贪婪之兽，吞噬万物，象征无尽的欲望' },
        { name: '穷奇', description: '邪恶之兽，背信弃义，象征混乱与背叛' },
        { name: '梼杌', description: '凶暴之兽，顽固不化，象征无法驯服的野性' },
        { name: '混沌', description: '无序之兽，无形无相，象征原始的混乱' }
    ],
    celestial: [
        { name: '囚牛', description: '龙之长子，喜好音乐，常立于琴头' },
        { name: '睚眦', description: '龙之次子，性格刚烈，嗜杀好斗，常刻于刀剑之上' },
        { name: '嘲风', description: '龙之三子，形似兽，喜好冒险，常立于殿角' },
        { name: '蒲牢', description: '龙之四子，形似龙而小，性好鸣，常铸于钟上' },
        { name: '狻猊', description: '龙之五子，形似狮子，喜静好坐，常立于香炉' },
        { name: '霸下', description: '龙之六子，形似龟，力大无穷，常背负石碑' },
        { name: '狴犴', description: '龙之七子，形似虎，明辨是非，常立于狱门' },
        { name: '负屃', description: '龙之八子，形似龙，雅好诗文，常盘于碑顶' },
        { name: '螭吻', description: '龙之九子，形似鱼，能吞火，常立于屋脊' }
    ],
    mystic: [
        { name: '火凤凰', description: '浴火重生的永恒之鸟' },
        { name: '雷鹰', description: '掌控雷电的猛禽' },
        { name: '冰狼', description: '冰原霸主' },
        { name: '岩龟', description: '坚不可摧的守护者' }
    ],
    spiritual: [
        { name: '玄龟', description: '擅长防御的水系灵宠' },
        { name: '风隼', description: '速度极快的飞行灵宠' },
        { name: '地甲', description: '坚固的大地守护者' },
        { name: '云豹', description: '敏捷的猎手' }
    ],
    mortal: [
        { name: '灵猫', description: '敏捷的小型灵宠' },
        { name: '幻蝶', description: '美丽的蝴蝶灵宠' },
        { name: '火鼠', description: '活泼的啮齿类灵宠' },
        { name: '草兔', description: '温顺的兔类灵宠' }
    ]
}

// 根据境界调整装备品质概率
const getEquipProbabilities = (level) => {
    // 基础概率
    const baseProbs = {
        common: 0.35,      // 凡品 35%
        uncommon: 0.30,    // 下品 30%
        rare: 0.17,        // 中品 17%
        epic: 0.11,        // 上品 11%
        legendary: 0.05,   // 极品 5%
        mythic: 0.02       // 仙品 2%
    }
    // 根据境界调整概率
    const adjustedProbs = { ...baseProbs }
    const levelBonus = Math.min(0.2, level * 0.01) // 每级提升1%，最高20%
    // 降低低品质概率
    adjustedProbs.common = Math.max(0.15, baseProbs.common - levelBonus)
    adjustedProbs.uncommon = Math.max(0.20, baseProbs.uncommon - levelBonus * 0.5)
    // 提升高品质概率
    const extraChance = (baseProbs.common - adjustedProbs.common) + (baseProbs.uncommon - adjustedProbs.uncommon)
    adjustedProbs.rare += extraChance * 0.4
    adjustedProbs.epic += extraChance * 0.3
    adjustedProbs.legendary += extraChance * 0.2
    adjustedProbs.mythic += extraChance * 0.1
    return adjustedProbs
}

// 抽取单个装备
const drawSingleEquip = () => {
    const random = Math.random()
    let accumulatedProb = 0
    const currentProbs = getEquipProbabilities(playerStore.level || 1)
    for (const [quality, probability] of Object.entries(currentProbs)) {
        accumulatedProb += probability
        if (random <= accumulatedProb) {
            // 随机选择装备类型
            const types = Object.keys(equipmentTypes)
            const type = types[Math.floor(Math.random() * types.length)]
            // 生成装备
            return generateEquipment(playerStore.level || 1, type, quality)
        }
    }
}

// 抽取单个灵宠
const drawSinglePet = () => {
    const random = Math.random()
    let accumulatedProb = 0
    for (const [rarity, config] of Object.entries(petRarities)) {
        accumulatedProb += config.probability
        if (random <= accumulatedProb) {
            const pool = petPool[rarity]
            const pet = pool[Math.floor(Math.random() * pool.length)]
            // 根据品质生成升级道具数量
            const upgradeItemCount = {
                divine: 5,
                celestial: 4,
                mystic: 3,
                spiritual: 2,
                mortal: 1
            }
            return {
                ...pet,
                rarity,
                type: 'pet',
                quality: {
                    strength: Math.floor(Math.random() * 10) + 1,
                    agility: Math.floor(Math.random() * 10) + 1,
                    intelligence: Math.floor(Math.random() * 10) + 1,
                    constitution: Math.floor(Math.random() * 10) + 1
                },
                power: 0,
                experience: 0,
                maxExperience: 100,
                level: 1,
                star: 0,
                upgradeItems: upgradeItemCount[rarity] || 1,
                // 添加战斗属性
                combatAttributes: {
                    attack: (10 + Math.floor(Math.random() * 5)) * (rarity === 'divine' ? 5 : rarity === 'celestial' ? 4 : rarity === 'mystic' ? 3 : rarity === 'spiritual' ? 2 : 1),
                    health: (100 + Math.floor(Math.random() * 20)) * (rarity === 'divine' ? 5 : rarity === 'celestial' ? 4 : rarity === 'mystic' ? 3 : rarity === 'spiritual' ? 2 : 1),
                    defense: (5 + Math.floor(Math.random() * 3)) * (rarity === 'divine' ? 5 : rarity === 'celestial' ? 4 : rarity === 'mystic' ? 3 : rarity === 'spiritual' ? 2 : 1),
                    speed: (10 + Math.floor(Math.random() * 5)) * (rarity === 'divine' ? 3 : rarity === 'celestial' ? 2.5 : rarity === 'mystic' ? 2 : rarity === 'spiritual' ? 1.5 : 1),
                    critRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                    comboRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                    counterRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                    stunRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                    dodgeRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                    vampireRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1)
                }
            }
        }
    }
}

// 综合池概率配置
const getAllPoolProbabilities = (level) => {
    const equipProbs = getEquipProbabilities(level)
    const totalEquipProb = 0.5 // 装备占50%概率
    const totalPetProb = 0.5 // 灵宠占50%概率
    // 调整装备概率
    const adjustedEquipProbs = {}
    Object.entries(equipProbs).forEach(([quality, prob]) => {
        adjustedEquipProbs[quality] = prob * totalEquipProb
    })
    // 调整灵宠概率
    const adjustedPetProbs = {}
    Object.entries(petRarities).forEach(([rarity, config]) => {
        adjustedPetProbs[rarity] = config.probability * totalPetProb
    })
    return {
        equipment: adjustedEquipProbs,
        pet: adjustedPetProbs
    }
}

// 从综合池抽取
const drawFromAllPool = () => {
    const random = Math.random()
    const probs = getAllPoolProbabilities(playerStore.level || 1)
    // 先决定是抽装备还是灵宠
    if (random < 0.5) {
        // 抽装备
        let accumulatedProb = 0
        for (const [quality, probability] of Object.entries(probs.equipment)) {
            accumulatedProb += probability
            if (random * 2 <= accumulatedProb) {
                const types = Object.keys(equipmentTypes)
                const type = types[Math.floor(Math.random() * types.length)]
                return {
                    ...generateEquipment(playerStore.level || 1, type, quality),
                    type: 'equipment',
                    equipType: type
                }
            }
        }
        // 如果没有命中任何概率，返回最低品质的装备
        const types = Object.keys(equipmentTypes)
        const type = types[Math.floor(Math.random() * types.length)]
        return {
            ...generateEquipment(playerStore.level || 1, type, 'common'),
            type: 'equipment',
            equipType: type
        }
    } else {
        // 抽灵宠
        let accumulatedProb = 0
        for (const [rarity, config] of Object.entries(petRarities)) {
            accumulatedProb += config.probability
            if ((random - 0.5) * 2 <= accumulatedProb) {
                const pool = petPool[rarity]
                const pet = pool[Math.floor(Math.random() * pool.length)]
                const upgradeItemCount = {
                    divine: 5,
                    celestial: 4,
                    mystic: 3,
                    spiritual: 2,
                    mortal: 1
                }
                return {
                    ...pet,
                    rarity,
                    type: 'pet',
                    quality: {
                        strength: Math.floor(Math.random() * 10) + 1,
                        agility: Math.floor(Math.random() * 10) + 1,
                        intelligence: Math.floor(Math.random() * 10) + 1,
                        constitution: Math.floor(Math.random() * 10) + 1
                    },
                    power: 0,
                    experience: 0,
                    maxExperience: 100,
                    level: 1,
                    star: 0,
                    upgradeItems: upgradeItemCount[rarity] || 1,
                    combatAttributes: {
                        attack: (10 + Math.floor(Math.random() * 5)) * (rarity === 'divine' ? 5 : rarity === 'celestial' ? 4 : rarity === 'mystic' ? 3 : rarity === 'spiritual' ? 2 : 1),
                        health: (100 + Math.floor(Math.random() * 20)) * (rarity === 'divine' ? 5 : rarity === 'celestial' ? 4 : rarity === 'mystic' ? 3 : rarity === 'spiritual' ? 2 : 1),
                        defense: (5 + Math.floor(Math.random() * 3)) * (rarity === 'divine' ? 5 : rarity === 'celestial' ? 4 : rarity === 'mystic' ? 3 : rarity === 'spiritual' ? 2 : 1),
                        speed: (10 + Math.floor(Math.random() * 5)) * (rarity === 'divine' ? 3 : rarity === 'celestial' ? 2.5 : rarity === 'mystic' ? 2 : rarity === 'spiritual' ? 1.5 : 1),
                        critRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                        comboRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                        counterRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                        stunRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                        dodgeRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1),
                        vampireRate: Math.random() * 0.1 * (rarity === 'divine' ? 2 : rarity === 'celestial' ? 1.8 : rarity === 'mystic' ? 1.6 : rarity === 'spiritual' ? 1.4 : 1)
                    }
                }
            }
        }
        // 如果没有命中任何概率，返回最低品质的灵宠
        const pool = petPool.mortal
        const pet = pool[Math.floor(Math.random() * pool.length)]
        return {
            ...pet,
            rarity: 'mortal',
            type: 'pet',
            quality: {
                strength: Math.floor(Math.random() * 10) + 1,
                agility: Math.floor(Math.random() * 10) + 1,
                intelligence: Math.floor(Math.random() * 10) + 1,
                constitution: Math.floor(Math.random() * 10) + 1
            },
            power: 0,
            experience: 0,
            maxExperience: 100,
            level: 1,
            star: 0,
            upgradeItems: 1,
            combatAttributes: {
                attack: 10 + Math.floor(Math.random() * 5),
                health: 100 + Math.floor(Math.random() * 20),
                defense: 5 + Math.floor(Math.random() * 3),
                speed: 10 + Math.floor(Math.random() * 5),
                critRate: Math.random() * 0.1,
                comboRate: Math.random() * 0.1,
                counterRate: Math.random() * 0.1,
                stunRate: Math.random() * 0.1,
                dodgeRate: Math.random() * 0.1,
                vampireRate: Math.random() * 0.1
            }
        }
    }
}

// 执行抽卡
const performGacha = async (times) => {
    const cost = times * 100
    if (playerStore.spiritStones < cost) {
        message.error('灵石不足！')
        return
    }
    const itemType = gachaType.value
    if (itemType !== 'all' && playerStore.items.filter(item => item.type === itemType).length >= 100) {
        message.error(`${itemType === 'equipment' ? '装备' : '灵宠'}背包已满，请先处理一些${itemType === 'equipment' ? '装备' : '灵宠'}`)
        return
    }
    if (isDrawing.value) return
    isDrawing.value = true
    // 扣除灵石
    playerStore.spiritStones -= cost
    // 开始抽卡动画
    isShaking.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    isShaking.value = false
    isOpening.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 生成抽卡结果
    const results = Array(times).fill().map(() => {
        if (gachaType.value === 'all') {
            return drawFromAllPool()
        } else {
            return gachaType.value === 'equipment' ? drawSingleEquip() : drawSinglePet()
        }
    })
    // 添加到背包
    results.forEach(item => {
        if (item.type === 'pet') {
            // 根据品质获得精华
            const rarityConfig = playerStore.petConfig.rarityMap[item.rarity]
            if (rarityConfig) {
                playerStore.petEssence += rarityConfig.essenceBonus
            }
        }
        playerStore.items.push({
            ...item,
            id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
    })
    // 保存数据
    playerStore.saveData()
    // 显示结果
    gachaResult.value = results
    filteredResults.value = results
    currentPage.value = 1
    selectedQuality.value = null
    isOpening.value = false
    showResult.value = true
    isDrawing.value = false
}

// 筛选结果
const filterResults = () => {
    if (!gachaResult.value) return
    filteredResults.value = gachaResult.value.filter(item => {
        if (!selectedQuality.value) return true
        if (gachaType.value === 'equipment') {
            return item.quality === selectedQuality.value
        } else {
            return item.rarity === selectedQuality.value
        }
    })
    currentPage.value = 1
}

// 计算当前页的结果
const currentPageResults = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredResults.value.slice(start, end)
})

// 计算总页数
const totalPages = computed(() => {
    return Math.ceil(filteredResults.value.length / pageSize.value)
})

const types = {
    equipment: '📦',
    pet: '🥚',
    all: '🎁'
}
</script>

<template>
    <n-layout>
        <n-layout-header bordered>
            <n-page-header>
                <template #title>
                    抽奖系统
                </template>
            </n-page-header>
        </n-layout-header>
        <n-layout-content class="gacha-content">
            <n-card>
                <div class="gacha-container">
                    <div class="gacha-type-selector">
                        <n-radio-group v-model:value="gachaType" name="gachaType">
                            <n-radio-button value="all">综合池</n-radio-button>
                            <n-radio-button value="equipment">装备池</n-radio-button>
                            <n-radio-button value="pet">灵宠池</n-radio-button>
                        </n-radio-group>
                    </div>
                    <div class="spirit-stones">
                        <n-statistic label="灵石" :value=" formatNumberToChineseUnit(playerStore.spiritStones)" />
                    </div>
                    <div class="gacha-item-container">
                        <div class="gacha-item" :class="{
                            'shake': isShaking,
                            'open': isOpening
                        }">
                            {{ types[gachaType] }}
                        </div>
                    </div>
                    <div class="gacha-buttons">
                        <n-space vertical>
                            <n-space justify="center">
                                <n-button type="primary" @click="performGacha(1)" :disabled="playerStore.spiritStones < 100 || isDrawing">
                                    抽1次 (100灵石)
                                </n-button>
                                <n-button type="primary" @click="performGacha(10)" :disabled="playerStore.spiritStones < 1000 || isDrawing">
                                    抽10次 (1000灵石)
                                </n-button>
                                <n-button type="primary" @click="performGacha(50)" :disabled="playerStore.spiritStones < 5000 || isDrawing">
                                    抽50次 (5000灵石)
                                </n-button>
                                <n-button type="primary" @click="performGacha(100)" :disabled="playerStore.spiritStones < 10000 || isDrawing">
                                    抽100次 (10000灵石)
                                </n-button>
                            </n-space>
                            <n-space justify="center">
                                <n-button quaternary circle size="small" @click="showProbabilityInfo = true">
                                    <template #icon>
                                        <n-icon><information-circle-outline /></n-icon>
                                    </template>
                                </n-button>
                            </n-space>
                        </n-space>
                    </div>
                    <!-- 抽卡结果弹窗 -->
                    <n-modal v-model:show="showResult" preset="dialog" title="抽卡结果" :style="{ maxWidth: '90vw', width: '800px' }">
                        <template #header-extra>
                            <n-select v-model:value="selectedQuality" :options="gachaType === 'equipment' ?
                            Object.entries(equipmentQualities).map(([key, value]) => ({
                                label: value.name,
                                value: key
                            })) :
                            Object.entries(petRarities).map(([key, value]) => ({
                                label: value.name,
                                value: key
                            }))" placeholder="选择品质筛选" clearable @update:value="filterResults" style="width: 120px" />
                        </template>
                        <div class="result-grid">
                            <div v-for="item in currentPageResults" :key="item.id" class="result-item" :style="{
                            borderColor: item.qualityInfo ? item.qualityInfo.color : petRarities[item.rarity]?.color || '#CCCCCC'
                        }">
                                <h4>{{ item.name }}</h4>
                                <p>品质：{{ item.qualityInfo ? item.qualityInfo.name : (petRarities[item.rarity]?.name || '未知') }}</p>
                                <p v-if="item.type === 'equipment'">类型：{{ equipmentTypes[item.equipType]?.name || '未知装备' }}</p>
                                <p v-else-if="item.type === 'pet'">{{ item.description || '暂无描述' }}</p>
                            </div>
                        </div>
                        <template #action>
                            <n-space justify="center">
                                <n-pagination v-model:page="currentPage" :page-slot="7" :page-count="totalPages" :page-size="pageSize" />
                            </n-space>
                        </template>
                    </n-modal>
                    <!-- 概率说明弹窗 -->
                    <n-modal v-model:show="showProbabilityInfo" preset="dialog" title="抽卡概率说明">
                        <n-list>
                            <template v-if="gachaType === 'equipment'">
                                <n-list-item v-for="(probability, quality) in getEquipProbabilities(playerStore.level || 1)" :key="quality">
                                    <n-space justify="space-between">
                                        <span :style="{ color: equipmentQualities[quality].color }">
                                            {{ equipmentQualities[quality].name }}
                                        </span>
                                        <span>{{ (probability * 100).toFixed(2) }}%</span>
                                    </n-space>
                                </n-list-item>
                            </template>
                            <template v-else-if="gachaType === 'pet'">
                                <n-list-item v-for="(config, rarity) in petRarities" :key="rarity">
                                    <n-space justify="space-between">
                                        <span :style="{ color: config.color }">{{ config.name }}</span>
                                        <span>{{ (config.probability * 100).toFixed(2) }}%</span>
                                    </n-space>
                                </n-list-item>
                            </template>
                            <template v-else>
                                <n-list-item>
                                    <n-space vertical>
                                        <div>装备概率：50%</div>
                                        <div>灵宠概率：50%</div>
                                        <n-divider />
                                        <div>装备品质概率：</div>
                                        <n-list-item v-for="(probability, quality) in getAllPoolProbabilities(playerStore.level || 1).equipment" :key="quality">
                                            <n-space justify="space-between">
                                                <span :style="{ color: equipmentQualities[quality].color }">
                                                    {{ equipmentQualities[quality].name }}
                                                </span>
                                                <span>{{ (probability * 100).toFixed(2) }}%</span>
                                            </n-space>
                                        </n-list-item>
                                        <n-divider />
                                        <div>灵宠品质概率：</div>
                                        <n-list-item v-for="(probability, rarity) in getAllPoolProbabilities(playerStore.level || 1).pet" :key="rarity">
                                            <n-space justify="space-between">
                                                <span :style="{ color: petRarities[rarity].color }">{{ petRarities[rarity].name }}</span>
                                                <span>{{ (probability * 100).toFixed(2) }}%</span>
                                            </n-space>
                                        </n-list-item>
                                    </n-space>
                                </n-list-item>
                            </template>
                        </n-list>
                    </n-modal>
                </div>
            </n-card>
        </n-layout-content>
    </n-layout>
</template>

<style scoped>
.gacha-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.gacha-type-selector {
    margin-bottom: 20px;
}

.spirit-stones {
    align-self: flex-end;
}

.gacha-item-container {
    position: relative;
    width: 200px;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.gacha-item {
    font-size: 100px;
    transition: transform 0.3s ease;
}

.gacha-item.shake {
    animation: shake 0.5s ease-in-out infinite;
}

.gacha-item.open {
    animation: open 1s ease-in-out;
}

@keyframes shake {

    0%,
    100% {
        transform: rotate(0deg);
    }

    25% {
        transform: rotate(-5deg);
    }

    75% {
        transform: rotate(5deg);
    }
}

@keyframes open {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.2);
        opacity: 0.5;
    }

    100% {
        transform: scale(0);
        opacity: 0;
    }
}

.result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin: 16px 0;
}

.result-item {
    background: var(--n-color);
    border: 2px solid;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
}

.result-item h4 {
    margin: 0 0 8px 0;
}

.result-item p {
    margin: 4px 0;
    font-size: 0.9em;
}

.gacha-buttons {
    margin-top: 20px;
}

@media screen and (max-width: 768px) {
    .result-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>