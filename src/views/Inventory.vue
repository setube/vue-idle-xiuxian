<script setup>
import { usePlayerStore } from '../stores/player'
import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { getStatName, formatStatValue} from '../plugins/stats'
import { getRealmName } from '../plugins/realm'
import { pillRecipes, pillGrades, pillTypes, calculatePillEffect } from '../plugins/pills'
import { enhanceEquipment, reforgeEquipment } from '../plugins/equipment'
import { formatNumberToChineseUnit } from '../plugins/utils'
// 分页相关
const currentPage = ref(1)
const pageSize = ref(12)

// 放生确认弹窗
const showReleaseConfirm = ref(false)
const showBatchReleaseConfirm = ref(false)
const petToRelease = ref(null)

// 过滤后的灵宠列表
const filteredPets = computed(() => {
    return playerStore.items.filter(item => item.type === 'pet')
})

// 当前页显示的灵宠
const displayPets = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredPets.value.slice(start, end)
})

// 页大小改变处理
const onPageSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
}

const playerStore = usePlayerStore()
const message = useMessage()

// 使用丹药
const usePill = (pill) => {
    // 获取丹药配方
    const recipe = pillRecipes.find(r => r.name === pill.name)
    if (!recipe) {
        message.error('丹药不存在')
        return
    }
    // 计算丹药效果
    const effect = calculatePillEffect(recipe, playerStore.level)
    // 添加效果到玩家状态
    playerStore.activeEffects.push({
        ...effect,
        startTime: Date.now(),
        pillId: pill.id
    })
    // 从背包中移除丹药
    const index = playerStore.items.findIndex(item => item.id === pill.id)
    if (index > -1) {
        playerStore.items.splice(index, 1)
        playerStore.pillsConsumed++
        playerStore.saveData()
        message.success('成功使用丹药')
    }
}

// 灵宠品质配置
const petRarities = {
    divine: {
        name: '神品',
        color: '#FF0000',
        probability: 0.02,
        essenceBonus: 50
    },
    celestial: {
        name: '仙品',
        color: '#FFD700',
        probability: 0.08,
        essenceBonus: 30
    },
    mystic: {
        name: '玄品',
        color: '#9932CC',
        probability: 0.15,
        essenceBonus: 20
    },
    spiritual: {
        name: '灵品',
        color: '#1E90FF',
        probability: 0.25,
        essenceBonus: 10
    },
    mortal: {
        name: '凡品',
        color: '#32CD32',
        probability: 0.5,
        essenceBonus: 5
    }
}

// 灵宠详情相关
const showPetModal = ref(false)
const selectedPet = ref(null)
const selectedFoodPet = ref(null)

// 放生确认弹窗
// const showReleaseConfirm = ref(false)
// const showBatchReleaseConfirm = ref(false)
// const petToRelease = ref(null)

// 显示放生确认弹窗
const confirmReleasePet = (pet) => {
    petToRelease.value = pet
    showReleaseConfirm.value = true
}

// 取消放生
const cancelReleasePet = () => {
    petToRelease.value = null
    showReleaseConfirm.value = false
}

// 执行放生
const releasePet = () => {
    if (petToRelease.value) {
        // 如果灵宠正在出战，先取消出战
        if (playerStore.activePet?.id === petToRelease.value.id) {
            playerStore.activePet = null
        }
        // 从背包中移除灵宠
        const index = playerStore.items.findIndex(item => item.id === petToRelease.value.id)
        if (index > -1) {
            playerStore.items.splice(index, 1)
            playerStore.saveData()
            message.success('已放生灵宠')
        }
        // 关闭所有相关弹窗
        showReleaseConfirm.value = false
        showPetModal.value = false
        petToRelease.value = null
    }
}

// 选中的放生品阶
const selectedRaritiesToRelease = ref(JSON.parse(localStorage.getItem('selectedRaritiesToRelease') || '[]'))

// 批量放生函数
const batchReleasePets = () => {
    playerStore.items = playerStore.items.filter(item => 
        item.type !== 'pet' || 
        item.id === playerStore.activePet?.id || 
        !selectedRaritiesToRelease.value.includes(item.rarity)
    )
    showBatchReleaseConfirm.value = false
    message.success('已放生选中品阶的未出战灵宠')
    playerStore.saveData()
}

// 监听选中品阶变化并保存到本地存储
watch(selectedRaritiesToRelease, (newVal) => {
    localStorage.setItem('selectedRaritiesToRelease', JSON.stringify(newVal))
}, { deep: true })

// 显示灵宠详情
const showPetDetails = (pet) => {
    selectedPet.value = pet
    selectedFoodPet.value = null
    showPetModal.value = true
}

// 计算灵宠属性加成
const getPetBonus = (pet) => {
    if (!pet) return { attack: 0, defense: 0, health: 0 }
    const qualityBonusMap = {
        divine: 0.5,
        celestial: 0.3,
        mystic: 0.2,
        spiritual: 0.1,
        mortal: 0.05
    }
    const starBonusPerQuality = {
        divine: 0.1,
        celestial: 0.08,
        mystic: 0.06,
        spiritual: 0.04,
        mortal: 0.02
    }
    const baseBonus = qualityBonusMap[pet.rarity] || 0.05
    const starBonus = ((pet.star || 0) * (starBonusPerQuality[pet.rarity] || 0.02))
    const totalBonus = baseBonus + starBonus
    const phase = Math.floor((pet.star || 0) / 5)
    const phaseBonus = phase * (baseBonus * 0.5)
    const finalBonus = totalBonus + phaseBonus
    return {
        attack: finalBonus,
        defense: finalBonus,
        health: finalBonus
    }
}

// 获取升级所需精华数量
const getUpgradeCost = (pet) => {
    return ((pet.level || 1) * 10)
}

// 检查是否可以升级
const canUpgrade = (pet) => {
    const cost = getUpgradeCost(pet)
    return playerStore.petEssence >= cost
}

// 获取可用作升星材料的灵宠列表
const getAvailableFoodPets = (pet) => {
    if (!pet) return []
    return playerStore.items
        .filter(item => 
            item.type === 'pet' &&
            item.id !== pet.id &&
            item.rarity === pet.rarity &&
            item.name === pet.name
        )
        .map(item => ({
            label: `${item.name} (${item.level || 1}级 ${item.star || 0}星)`,
            value: item.id
        }))
}

// 升级灵宠
const upgradePet = (pet) => {
    const result = playerStore.upgradePet(pet, getUpgradeCost(pet))
    if (result.success) {
        message.success(result.message)
    } else {
        message.error(result.message)
    }
}

// 升星灵宠
const evolvePet = (pet) => {
    if (!selectedFoodPet.value) {
        message.error('请选择用于升星的灵宠')
        return
    }
    // 通过id查找对应的灵宠对象
    const foodPet = playerStore.items.find(item => item.id === selectedFoodPet.value)
    if (!foodPet) {
        message.error('升星材料灵宠不存在')
        return
    }
    const result = playerStore.evolvePet(pet, foodPet)
    if (result.success) {
        message.success(result.message)
        selectedFoodPet.value = null
        showPetModal.value = false
    } else {
        message.error(result.message)
    }
}

// 装备类型配置
const equipmentTypes = {
    weapon: '武器',
    head: '头部',
    body: '衣服',
    legs: '裤子',
    feet: '鞋子',
    shoulder: '肩甲',
    hands: '手套',
    wrist: '护腕',
    necklace: '项链',
    ring1: '戒指1',
    ring2: '戒指2',
    belt: '腰带',
    artifact: '法宝'
}

// 当前选中的装备类型
const selectedType = ref('')

// 显示装备类型弹窗
const showEquipmentList = (type) => {
    selectedType.value = type
    selectedEquipmentType.value = type
    showEquipmentModal.value = true
}

// 卸下装备
const unequipItem = (slot) => {
    const result = playerStore.unequipArtifact(slot)
    if (result.success) {
        message.success(result.message)
    } else {
        message.error(result.message || '操作失败')
    }
}

// 装备列表相关
const showEquipmentModal = ref(false)
const selectedEquipmentType = ref('')
const selectedQuality = ref('all')
const currentEquipmentPage = ref(1)
const equipmentPageSize = ref(8)

// 装备品质选项
const qualityOptions = [
    { label: '全部品质', value: 'all' },
    { label: '仙品', value: 'mythic' },
    { label: '极品', value: 'legendary' },
    { label: '上品', value: 'epic' },
    { label: '中品', value: 'rare' },
    { label: '下品', value: 'uncommon' },
    { label: '凡品', value: 'common' }
]

// 过滤后的装备列表
const filteredEquipmentList = computed(() => {
    let list = playerStore.items.filter(item => {
        if (!selectedEquipmentType.value) return false
        if (item.type !== selectedEquipmentType.value) return false
        if (selectedQuality.value !== 'all' && item.quality !== selectedQuality.value) return false
        return true
    })
    return list
})

// 当前页显示的装备
const equipmentList = computed(() => {
    const start = (currentEquipmentPage.value - 1) * equipmentPageSize.value
    const end = start + equipmentPageSize.value
    return filteredEquipmentList.value.slice(start, end)
})

// 装备页大小改变处理
const onEquipmentPageSizeChange = (size) => {
    equipmentPageSize.value = size
    currentEquipmentPage.value = 1
}

// 批量卖出装备
const batchSellEquipments = () => {
    const result = playerStore.batchSellEquipments(selectedQuality.value === 'all' ? null : selectedQuality.value)
    if (result.success) {
        message.success(result.message)
    } else {
        message.error(result.message || '批量卖出失败')
    }
}

// 卖出单件装备
const sellEquipment = (equipment) => {
    const result = playerStore.sellEquipment(equipment)
    if (result.success) {
        message.success(result.message)
        showEquipmentDetailModal.value = false
    } else {
        message.error(result.message || '卖出失败')
    }
}

// 显示装备详情
const showEquipmentDetails = (equipment) => {
    selectedEquipment.value = equipment
    showEquipmentDetailModal.value = true
}

// 装备详情相关
const showEquipmentDetailModal = ref(false)
const selectedEquipment = ref(null)

// 强化确认弹窗
const showEnhanceConfirm = ref(false)
const enhanceResult = ref(null)

// 强化装备
const handleEnhanceEquipment = () => {
    if (!selectedEquipment.value) return
    const result = enhanceEquipment(selectedEquipment.value, playerStore.reinforceStones)
    if (result.success) {
        playerStore.reinforceStones -= result.cost
        selectedEquipment.value.stats = { ...result.newStats }
        selectedEquipment.value.enhanceLevel = result.newLevel
        message.success('强化成功')
        playerStore.saveData()
    } else {
        message.error(result.message || '强化失败')
    }
}

// 洗练确认弹窗
const showReforgeConfirm = ref(false)
const reforgeResult = ref(null)

// 洗练装备
const handleReforgeEquipment = () => {
    if (!selectedEquipment.value) return
    const result = reforgeEquipment(selectedEquipment.value, playerStore.spiritStones, false)
    if (result.success) {
        playerStore.spiritStones -= result.cost
        reforgeResult.value = result
        showReforgeConfirm.value = true
    } else {
        message.error(result.message || '洗练失败')
    }
}

// 确认洗练结果
const confirmReforgeResult = (confirm) => {
    if (!reforgeResult.value) return
    if (confirm) {
        // 用户确认后，应用新属性
        selectedEquipment.value.stats = reforgeResult.value.newStats
        message.success('已确认新属性')
    } else {
        // 用户取消，保留原属性
        message.info('已保留原有属性')
    }
    showReforgeConfirm.value = false
    reforgeResult.value = null
    playerStore.saveData()
}

// 使用装备
const equipItem = (equipment) => {
    const result = playerStore.equipArtifact(equipment, equipment.type)
    if (result.success) {
        message.success(result.message)
        showEquipmentModal.value = false
        showEquipmentDetailModal.value = false
    } else {
        message.error(result.message || '装备失败')
    }
}

// 计算灵草分组
const groupedHerbs = computed(() => {
    const groups = {}
    playerStore.herbs.forEach(herb => {
        if (!groups[herb.name]) {
            groups[herb.name] = {
                ...herb,
                count: 1
            }
        } else {
            groups[herb.name].count++
        }
    })
    return Object.values(groups)
})

// 计算丹方分组
const groupedFormulas = computed(() => {
    // 从pillRecipes中获取完整丹方
    const complete = playerStore.pillRecipes.map(recipeId => {
        const recipe = pillRecipes.find(r => r.id === recipeId)
        return recipe ? {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            grade: recipe.grade,
            type: recipe.type,
            isComplete: true
        } : null
    }).filter(Boolean)

    // 从pillFragments中获取残缺丹方
    const incomplete = Object.entries(playerStore.pillFragments).map(([recipeId, fragments]) => {
        const recipe = pillRecipes.find(r => r.id === recipeId)
        return recipe ? {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            grade: recipe.grade,
            type: recipe.type,
            isComplete: false,
            fragments,
            fragmentsNeeded: recipe.fragmentsNeeded
        } : null
    }).filter(Boolean)

    return { complete, incomplete }
})

// 计算丹药分组
const groupedPills = computed(() => {
    const groups = {}
    playerStore.items
        .filter(item => item.type === 'pill')
        .forEach(pill => {
            if (!groups[pill.name]) {
                groups[pill.name] = {
                    ...pill,
                    count: 1
                }
            } else {
                groups[pill.name].count++
            }
        })
    return Object.values(groups)
})
// 使用物品
const useItem = (item) => {
    if (item.type === 'pet') {
        const result = playerStore.usePet(item)
        if (result.success) {
            message.success(result.message)
        } else {
            message.error(result.message || '操作失败')
        }
    }
}
</script>

<template>
    <n-layout>
        <n-layout-header bordered>
            <n-page-header>
                <template #title>
                    背包
                </template>
            </n-page-header>
        </n-layout-header>
        <n-layout-content>
            <n-card>
                <n-tabs type="line">
                    <n-tab-pane name="equipment" tab="装备">
                        <n-grid :cols="2" :x-gap="12" :y-gap="8">
                            <n-grid-item v-for="(name, type) in equipmentTypes" :key="type">
                                <n-card hoverable @click="showEquipmentList(type)">
                                    <template #header>
                                        <n-space justify="space-between">
                                            <span>{{ name }}</span>
                                            <n-button size="small" type="error" 
                                                @click.stop="unequipItem(type)" 
                                                v-if="playerStore.equippedArtifacts[type]">
                                                卸下
                                            </n-button>
                                        </n-space>
                                    </template>
                                    <p v-if="playerStore.equippedArtifacts[type]">
                                        {{ playerStore.equippedArtifacts[type].name }}
                                    </p>
                                    <p v-else>未装备</p>
                                </n-card>
                            </n-grid-item>
                        </n-grid>
                    </n-tab-pane>
                    <n-tab-pane name="herbs" tab="灵草">
                        <n-grid :cols="2" :x-gap="12" :y-gap="8">
                            <n-grid-item v-for="herb in groupedHerbs" :key="herb.id">
                                <n-card hoverable>
                                    <template #header>
                                        <n-space justify="space-between">
                                            <span>{{ herb.name }}({{ herb.count }})</span>
                                        </n-space>
                                    </template>
                                    <p>{{ herb.description }}</p>
                                </n-card>
                            </n-grid-item>
                        </n-grid>
                    </n-tab-pane>
                    <n-tab-pane name="pills" tab="丹药">
                        <n-grid :cols="2" :x-gap="12" :y-gap="8">
                            <n-grid-item v-for="pill in groupedPills" :key="pill.id">
                                <n-card hoverable>
                                    <template #header>
                                        <n-space justify="space-between">
                                            <span>{{ pill.name }}({{ pill.count }})</span>
                                            <n-button size="small" type="primary" @click="usePill(pill)">
                                                服用
                                            </n-button>
                                        </n-space>
                                    </template>
                                    <p>{{ pill.description }}</p>
                                </n-card>
                            </n-grid-item>
                        </n-grid>
                    </n-tab-pane>
                    <n-tab-pane name="formulas" tab="丹方">
                        <n-tabs type="segment">
                            <n-tab-pane name="complete" tab="完整丹方">
                                <n-grid :cols="2" :x-gap="12" :y-gap="8">
                                    <n-grid-item v-for="formula in groupedFormulas.complete" :key="formula.id">
                                        <n-card hoverable>
                                            <template #header>
                                                <n-space justify="space-between">
                                                    <span>{{ formula.name }}</span>
                                                    <n-space>
                                                        <n-tag type="success" size="small">完整</n-tag>
                                                        <n-tag type="info" size="small">{{ pillGrades[formula.grade].name }}</n-tag>
                                                        <n-tag type="warning" size="small">{{ pillTypes[formula.type].name }}</n-tag>
                                                    </n-space>
                                                </n-space>
                                            </template>
                                            <p>{{ formula.description }}</p>
                                        </n-card>
                                    </n-grid-item>
                                </n-grid>
                            </n-tab-pane>
                            <n-tab-pane name="incomplete" tab="残缺丹方">
                                <n-grid :cols="2" :x-gap="12" :y-gap="8">
                                    <n-grid-item v-for="formula in groupedFormulas.incomplete" :key="formula.id">
                                        <n-card hoverable>
                                            <template #header>
                                                <n-space justify="space-between">
                                                    <span>{{ formula.name }}</span>
                                                    <n-space>
                                                        <n-tag type="warning" size="small">残缺</n-tag>
                                                        <n-tag type="info" size="small">{{ pillGrades[formula.grade].name }}</n-tag>
                                                        <n-tag type="warning" size="small">{{ pillTypes[formula.type].name }}</n-tag>
                                                    </n-space>
                                                </n-space>
                                            </template>
                                            <p>{{ formula.description }}</p>
                                            <n-progress
                                                type="line"
                                                :percentage="Number(((formula.fragments / formula.fragmentsNeeded) * 100).toFixed(2))"
                                                :show-indicator="true"
                                                indicator-placement="inside"
                                            >
                                                收集进度: {{ formula.fragments }}/{{ formula.fragmentsNeeded }}
                                            </n-progress>
                                        </n-card>
                                    </n-grid-item>
                                </n-grid>
                            </n-tab-pane>
                        </n-tabs>
                    </n-tab-pane>
                    <n-tab-pane name="pets" tab="灵宠">
                        <n-button 
                        style="margin-bottom: 16px"
                        @click="showBatchReleaseConfirm = true" 
                        :disabled="!playerStore.items.filter(item => item.type === 'pet').length"
                        >一键放生</n-button>
                        <n-modal 
                        v-model:show="showBatchReleaseConfirm" 
                        preset="dialog" 
                        title="批量放生确认"
                        style="width: 600px"
                        >
                            <n-space vertical>
                                <p>请选择要放生的灵宠品质（可多选）：</p>
                                <n-checkbox-group v-model:value="selectedRaritiesToRelease">
                                    <n-space>
                                        <n-checkbox value="divine"><span :style="{ color: petRarities.divine.color }">神品</span></n-checkbox>
                                        <n-checkbox value="celestial"><span :style="{ color: petRarities.celestial.color }">仙品</span></n-checkbox>
                                        <n-checkbox value="mystic"><span :style="{ color: petRarities.mystic.color }">玄品</span></n-checkbox>
                                        <n-checkbox value="spiritual"><span :style="{ color: petRarities.spiritual.color }">灵品</span></n-checkbox>
                                        <n-checkbox value="mortal"><span :style="{ color: petRarities.mortal.color }">凡品</span></n-checkbox>
                                    </n-space>
                                </n-checkbox-group>
                                <p>确定要放生选中品阶的未出战灵宠吗？此操作不可撤销。</p>
                            </n-space>
                            <n-space justify="end" style="margin-top: 16px;">
                                <n-button size="small" @click="showBatchReleaseConfirm = false">取消</n-button>
                                <n-button size="small" type="error" @click="batchReleasePets">确认放生</n-button>
                            </n-space>
                        </n-modal>
                        <div>
                            <n-pagination
                                v-model:page="currentPage"
                                :page-size="pageSize"
                                :item-count="filteredPets.length"
                                @update:page-size="onPageSizeChange"
                                :page-slot="7"
                            />
                            <n-grid :cols="2" :x-gap="12" :y-gap="8" style="margin-top: 16px">
                                <n-grid-item v-for="pet in displayPets" :key="pet.id">
                                    <n-card hoverable>
                                        <template #header>
                                            <n-space justify="space-between">
                                                <span>{{ pet.name }}</span>
                                                <n-button size="small" type="primary" @click="useItem(pet)">
                                                    {{ playerStore.activePet?.id === pet.id ? '召回' : '出战' }}
                                                </n-button>
                                            </n-space>
                                        </template>
                                        <p>{{ pet.description }}</p>
                                        <n-space vertical>
                                            <n-tag :style="{ color: petRarities[pet.rarity].color }">
                                                {{ petRarities[pet.rarity].name }}
                                            </n-tag>
                                            <n-space justify="space-between">
                                                <n-text>等级: {{ pet.level || 1 }}</n-text>
                                                <n-text>星级: {{ pet.star || 0 }}</n-text>
                                                <n-button size="small" @click="showPetDetails(pet)">详情</n-button>
                                            </n-space>
                                        </n-space>
                                    </n-card>
                                </n-grid-item>
                            </n-grid>
                        </div>
                    </n-tab-pane>
                </n-tabs>
            </n-card>
        </n-layout-content>
    </n-layout>
    <!-- 灵宠详情弹窗 -->
    <n-modal v-model:show="showPetModal" preset="dialog" title="灵宠详情" style="width: 600px;">
        <template v-if="selectedPet">
            <n-descriptions bordered>
                <n-descriptions-item label="名称">{{ selectedPet.name }}</n-descriptions-item>
                <n-descriptions-item label="品质">
                    <n-tag :style="{ color: petRarities[selectedPet.rarity].color }">{{ petRarities[selectedPet.rarity].name }}</n-tag>
                </n-descriptions-item>
                <n-descriptions-item label="等级">{{ selectedPet.level || 1 }}</n-descriptions-item>
                <n-descriptions-item label="星级">{{ selectedPet.star || 0 }}</n-descriptions-item>
                <n-descriptions-item label="境界">{{ Math.floor((selectedPet.star || 0) / 5) }}阶</n-descriptions-item>
            </n-descriptions>
            <n-divider>属性加成</n-divider>
            <n-descriptions bordered>
                <n-descriptions-item label="攻击加成">+{{ getPetBonus(selectedPet).attack * 100 }}%</n-descriptions-item>
                <n-descriptions-item label="防御加成">+{{ getPetBonus(selectedPet).defense * 100 }}%</n-descriptions-item>
                <n-descriptions-item label="生命加成">+{{ getPetBonus(selectedPet).health * 100 }}%</n-descriptions-item>
            </n-descriptions>
            <n-divider>战斗属性</n-divider>
            <n-collapse>
                <n-collapse-item title="展开" name="1">
                    <n-descriptions bordered>
                        <n-descriptions-item label="攻击力">{{ formatNumberToChineseUnit(selectedPet.combatAttributes?.attack || 0 )}}</n-descriptions-item>
                        <n-descriptions-item label="生命值">{{ formatNumberToChineseUnit(selectedPet.combatAttributes?.health || 0 )}}</n-descriptions-item>
                        <n-descriptions-item label="防御力">{{ formatNumberToChineseUnit(selectedPet.combatAttributes?.defense || 0 )}}</n-descriptions-item>
                        <n-descriptions-item label="速度">{{ formatNumberToChineseUnit(selectedPet.combatAttributes?.speed || 0 )}}</n-descriptions-item>
                        <n-descriptions-item label="暴击率">{{ ((selectedPet.combatAttributes?.critRate || 0) * 100).toFixed(1) }}%</n-descriptions-item>
                        <n-descriptions-item label="连击率">{{ ((selectedPet.combatAttributes?.comboRate || 0) * 100).toFixed(1) }}%</n-descriptions-item>
                        <n-descriptions-item label="反击率">{{ ((selectedPet.combatAttributes?.counterRate || 0) * 100).toFixed(1) }}%</n-descriptions-item>
                        <n-descriptions-item label="眩晕率">{{ ((selectedPet.combatAttributes?.stunRate || 0) * 100).toFixed(1) }}%</n-descriptions-item>
                        <n-descriptions-item label="闪避率">{{ ((selectedPet.combatAttributes?.dodgeRate || 0) * 100).toFixed(1) }}%</n-descriptions-item>
                        <n-descriptions-item label="吸血率">{{ ((selectedPet.combatAttributes?.vampireRate || 0) * 100).toFixed(1) }}%</n-descriptions-item>
                    </n-descriptions>
                </n-collapse-item>
            </n-collapse>
            <n-divider>操作</n-divider>
            <n-space vertical>
                <n-space justify="space-between">
                    <span>升级（消耗{{ getUpgradeCost(selectedPet) }}灵宠精华）</span>
                    <n-button
                        size="small"
                        type="primary"
                        @click="upgradePet(selectedPet)"
                        :disabled="!canUpgrade(selectedPet)">
                        升级
                    </n-button>
                </n-space>
                <n-space justify="space-between">
                    <span>升星（需要相同品质和名字的灵宠）</span>
                    <n-select
                        v-model:value="selectedFoodPet"
                        :options="getAvailableFoodPets(selectedPet)"
                        placeholder="选择升星材料"
                        style="width: 200px"
                    />
                    <n-button
                        size="small"
                        type="warning"
                        @click="evolvePet(selectedPet)"
                        :disabled="!selectedFoodPet">
                        升星
                    </n-button>
                </n-space>
                <n-space justify="space-between">
                    <span>放生灵宠（不会返还已消耗的道具）</span>
                    <n-button
                        size="small"
                        type="error"
                        @click="confirmReleasePet(selectedPet)">
                        放生灵宠
                    </n-button>
                    <n-modal 
                    v-model:show="showReleaseConfirm" 
                    preset="dialog" 
                    title="灵宠放生"
                    style="width: 600px"
                    >
                        <template v-if="petToRelease">
                            <p>确定要放生 {{ petToRelease.name }} 吗？此操作不可撤销，且不会返还已消耗的道具。</p>
                            <n-space justify="end" style="margin-top: 16px;">
                                <n-button size="small" @click="cancelReleasePet">取消</n-button>
                                <n-button size="small" type="error" @click="releasePet">确认放生</n-button>
                            </n-space>
                        </template>
                    </n-modal>
                </n-space>
            </n-space>
        </template>
    </n-modal>
    <!-- 装备列表弹窗 -->
    <n-modal v-model:show="showEquipmentModal" preset="dialog" :title="`${equipmentTypes[selectedEquipmentType]}列表`" style="width: 800px;">
        <n-space vertical>
            <n-space justify="space-between">
                <n-select v-model:value="selectedQuality" :options="qualityOptions" style="width: 150px" />
                <n-button type="warning" @click="batchSellEquipments">一键卖出</n-button>
            </n-space>
            <n-pagination
                v-model:page="currentEquipmentPage"
                :page-size="equipmentPageSize"
                :item-count="filteredEquipmentList.length"
                @update:page-size="onEquipmentPageSizeChange"
                :page-slot="7"
            />
            <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="equipment in equipmentList" :key="equipment.id" @click="showEquipmentDetails(equipment)">
                    <n-card hoverable>
                        <template #header>
                            <n-space justify="space-between">
                                <span>{{ equipment.name }}</span>
                                <n-button size="small" type="warning" @click.stop="sellEquipment(equipment)">卖出</n-button>
                            </n-space>
                        </template>
                        <n-space vertical>
                            <n-tag :style="{ color: equipment.qualityInfo.color }">
                                {{ equipment.qualityInfo.name }}
                            </n-tag>
                            <n-text>境界要求：{{ getRealmName(equipment.requiredRealm) }}</n-text>
                        </n-space>
                    </n-card>
                </n-grid-item>
            </n-grid>
        </n-space>
    </n-modal>
    <!-- 装备详情弹窗 -->
    <n-modal v-model:show="showEquipmentDetailModal" preset="dialog" :title="selectedEquipment?.name || '装备详情'">
        <n-descriptions bordered>
            <n-descriptions-item label="品质">
                <span :style="{ color: selectedEquipment?.qualityInfo.color }">
                    {{ selectedEquipment?.qualityInfo.name }}
                </span>
            </n-descriptions-item>
            <n-descriptions-item label="类型">
                {{ equipmentTypes[selectedEquipment?.type] }}
            </n-descriptions-item>
            <n-descriptions-item label="强化等级">
                +{{ selectedEquipment?.enhanceLevel || 0 }}
            </n-descriptions-item>
            <template v-if="selectedEquipment?.stats">
                <n-descriptions-item v-for="(value, stat) in selectedEquipment.stats" :key="stat" :label="getStatName(stat)">
                    {{ formatStatValue(stat, value) }}
                </n-descriptions-item>
            </template>
        </n-descriptions>
        <template #action>
            <n-space justify="space-between">
                <n-space>
                    <n-button type="primary" @click="showEnhanceConfirm = true"
                        :disabled="(selectedEquipment?.enhanceLevel || 0) >= 10">
                        强化
                    </n-button>
                    <n-button type="info" @click="handleReforgeEquipment">
                        洗练
                    </n-button>
                </n-space>
                <n-space>
                    <n-button @click="equipItem(selectedEquipment)"
                        :disabled="playerStore.level < selectedEquipment?.requiredRealm">
                        装备
                    </n-button>
                    <n-button type="error" @click="sellEquipment(selectedEquipment)">
                        出售
                    </n-button>
                </n-space>
            </n-space>
        </template>
    </n-modal>
    <!-- 强化确认弹窗 -->
    <n-modal v-model:show="showEnhanceConfirm" preset="dialog" title="装备强化">
        <n-space vertical>
            <p>是否消耗 {{ ((selectedEquipment?.enhanceLevel || 0) + 1) * 10 }} 强化石强化装备？</p>
            <p>当前强化石数量：{{ playerStore.reinforceStones }}</p>
        </n-space>
        <template #action>
            <n-space justify="end">
                <n-button @click="showEnhanceConfirm = false">取消</n-button>
                <n-button type="primary" @click="handleEnhanceEquipment"
                    :disabled="playerStore.reinforceStones < ((selectedEquipment?.enhanceLevel || 0) + 1) * 10">
                    确认强化
                </n-button>
            </n-space>
        </template>
    </n-modal>
    <!-- 洗练确认弹窗 -->
    <n-modal v-model:show="showReforgeConfirm" preset="dialog" title="洗练结果确认">
        <template v-if="reforgeResult">
            <div class="reforge-compare">
                <div class="old-stats">
                    <h3>原始属性</h3>
                    <div v-for="(value, key) in reforgeResult.oldStats" :key="key">
                        {{ getStatName(key) }}: {{ formatStatValue(key, value) }}
                    </div>
                </div>
                <div class="new-stats">
                    <h3>新属性</h3>
                    <div v-for="(value, key) in reforgeResult.newStats" :key="key">
                        {{ getStatName(key) }}: {{ formatStatValue(key, value) }}
                    </div>
                </div>
            </div>
        </template>
        <template #action>
            <n-button type="primary" @click="confirmReforgeResult(true)">确认新属性</n-button>
            <n-button @click="confirmReforgeResult(false)">保留原属性</n-button>
        </template>
    </n-modal>
</template>
<style scoped>
.n-card {
    cursor: pointer;
}

.reforge-compare {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 16px 0;
}

.old-stats, .new-stats {
    flex: 1;
    padding: 16px;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.05);
}

.old-stats h3, .new-stats h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
    color: #666;
}
</style>
