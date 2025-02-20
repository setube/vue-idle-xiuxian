<script setup>
import { usePlayerStore } from '../stores/player'
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { getStatName, formatStatValue } from '../plugins/stats'
import { getRealmName } from '../plugins/realm'
import { pillRecipes, pillGrades, pillTypes, calculatePillEffect } from '../plugins/pills'

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
const showReleaseConfirm = ref(false)
const showBatchReleaseConfirm = ref(false)
const petToRelease = ref(null)

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

// 批量放生函数
const selectedRarities = ref([]) // 选中的品质数组

// 品质选项
const rarityOptions = [
    { label: '凡品', value: 'mortal', color: '#32CD32' },
    { label: '灵品', value: 'spiritual', color: '#1E90FF' },
    { label: '玄品', value: 'mystic', color: '#9932CC' },
    { label: '仙品', value: 'celestial', color: '#FFD700' },
    { label: '神品', value: 'divine', color: '#FF0000' }
]

// 批量放生灵宠
const batchReleasePets = () => {
    if (!selectedRarities.value.length) {
        message.warning('请选择要放生的灵宠品质')
        return
    }

    // 找出所有符合选中品质的灵宠
    const petsToRelease = playerStore.items.filter(item => 
        item.type === 'pet' && selectedRarities.value.includes(item.rarity)
    )

    if (!petsToRelease.length) {
        message.warning('没有找到符合条件的灵宠')
        return
    }

    // 如果灵宠正在出战，先取消出战
    if (playerStore.activePet && selectedRarities.value.includes(playerStore.activePet.rarity)) {
        playerStore.activePet = null
    }

    // 从背包中移除灵宠
    petsToRelease.forEach(pet => {
        const index = playerStore.items.findIndex(item => item.id === pet.id)
        if (index > -1) {
            playerStore.items.splice(index, 1)
        }
    })

    playerStore.saveData()
    message.success(`已放生 ${petsToRelease.length} 只灵宠`)
    showBatchReleaseConfirm.value = false
    selectedRarities.value = [] // 清空选择
}

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

// 按类型分组的装备列表
const equipmentByType = computed(() => {
    return playerStore.items
        .filter(item => item.type === 'equipment')
        .reduce((acc, item) => {
            if (!acc[item.slot]) acc[item.slot] = []
            acc[item.slot].push(item)
            return acc
        }, {})
})

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
const equipmentList = computed(() => {
    if (!selectedEquipmentType.value) return []
    return playerStore.items.filter(item => item.type === selectedEquipmentType.value)
})

// 显示装备详情
const showEquipmentDetails = (equipment) => {
    selectedEquipment.value = equipment
    showEquipmentDetailModal.value = true
}

// 装备详情相关
const showEquipmentDetailModal = ref(false)
const selectedEquipment = ref(null)

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
                        preset="card" 
                        title="批量放生灵宠"
                        style="width: 600px"
                        >
                            <n-space vertical>
                                <p>请选择要放生的灵宠品质（可多选）：</p>
                                <n-checkbox-group v-model:value="selectedRarities">
                                    <n-space>
                                        <n-checkbox
                                            v-for="option in rarityOptions"
                                            :key="option.value"
                                            :value="option.value"
                                            :style="{ color: option.color }"
                                        >
                                            {{ option.label }}
                                        </n-checkbox>
                                    </n-space>
                                </n-checkbox-group>
                                <p style="color: #f56c6c;">注意：此操作不可撤销，且不会返还已消耗的道具。</p>
                            </n-space>
                            <template #footer>
                                <n-space justify="end">
                                    <n-button 
                                        size="small" 
                                        @click="showBatchReleaseConfirm = false"
                                    >
                                        取消
                                    </n-button>
                                    <n-button 
                                        size="small" 
                                        type="error" 
                                        @click="batchReleasePets"
                                        :disabled="!selectedRarities.length"
                                    >
                                        确认放生
                                    </n-button>
                                </n-space>
                            </template>
                        </n-modal>
                        <n-grid :cols="2" :x-gap="12" :y-gap="8">
                            <n-grid-item v-for="pet in playerStore.items.filter(item => item.type === 'pet')" :key="pet.id">
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
                    </n-tab-pane>
                </n-tabs>
            </n-card>
        </n-layout-content>
    </n-layout>
    <!-- 灵宠详情弹窗 -->
    <n-modal v-model:show="showPetModal" preset="card" title="灵宠详情" style="width: 600px;">
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
                <n-descriptions-item label="攻击加成">+{{ (getPetBonus(selectedPet).attack * 100).toFixed(1) }}%</n-descriptions-item>
                <n-descriptions-item label="防御加成">+{{ (getPetBonus(selectedPet).defense * 100).toFixed(1) }}%</n-descriptions-item>
                <n-descriptions-item label="生命加成">+{{ (getPetBonus(selectedPet).health * 100).toFixed(1) }}%</n-descriptions-item>
            </n-descriptions>
            <n-divider>战斗属性</n-divider>
            <n-collapse>
                <n-collapse-item title="展开" name="1">
                    <n-descriptions bordered>
                        <n-descriptions-item label="攻击力">{{ selectedPet.combatAttributes?.attack || 0 }}</n-descriptions-item>
                        <n-descriptions-item label="生命值">{{ selectedPet.combatAttributes?.health || 0 }}</n-descriptions-item>
                        <n-descriptions-item label="防御力">{{ selectedPet.combatAttributes?.defense || 0 }}</n-descriptions-item>
                        <n-descriptions-item label="速度">{{ selectedPet.combatAttributes?.speed || 0 }}</n-descriptions-item>
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
                    preset="card" 
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
    <n-modal v-model:show="showEquipmentModal" preset="card" :title="`${equipmentTypes[selectedEquipmentType]}列表`" style="width: 800px;">
        <n-grid :cols="2" :x-gap="12" :y-gap="8">
            <n-grid-item v-for="equipment in equipmentList" :key="equipment.id" @click="showEquipmentDetails(equipment)">
                <n-card hoverable>
                    <template #header>
                        <n-space justify="space-between">
                            <span>{{ equipment.name }}</span>
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
    </n-modal>
    <!-- 装备详情弹窗 -->
    <n-modal v-model:show="showEquipmentDetailModal" preset="card" title="装备详情" style="width: 600px;">
        <template v-if="selectedEquipment">
            <n-descriptions bordered>
                <n-descriptions-item label="名称">{{ selectedEquipment.name }}</n-descriptions-item>
                <n-descriptions-item label="品质">
                    <n-tag :style="{ color: selectedEquipment.qualityInfo.color }">
                        {{ selectedEquipment.qualityInfo.name }}
                    </n-tag>
                </n-descriptions-item>
                <n-descriptions-item label="境界要求">{{ getRealmName(selectedEquipment.requiredRealm) }}</n-descriptions-item>
            </n-descriptions>
            <n-divider>基础属性</n-divider>
            <n-descriptions bordered>
                <n-descriptions-item v-for="(value, key) in selectedEquipment.stats" :key="key" :label="getStatName(key)">
                    {{ formatStatValue(key, value) }}
                </n-descriptions-item>
            </n-descriptions>
            <template v-if="selectedEquipment.effects && selectedEquipment.effects.length > 0">
                <n-divider>特殊效果</n-divider>
                <n-descriptions bordered>
                    <n-descriptions-item v-for="effect in selectedEquipment.effects" :key="effect.id" :label="effect.name">
                        {{ effect.description }}
                    </n-descriptions-item>
                </n-descriptions>
            </template>
            <n-space justify="end" style="margin-top: 16px;">
                <n-button type="primary" @click="equipItem(selectedEquipment)">装备</n-button>
            </n-space>
        </template>
    </n-modal>
</template>
<style scoped>
.n-card {
    cursor: pointer;
}
</style>
