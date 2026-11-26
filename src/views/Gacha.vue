<template>
  <n-layout>
    <n-layout-header bordered>
      <n-page-header>
        <template #title>抽奖系统</template>
      </n-page-header>
    </n-layout-header>
    <n-layout-content class="gacha-content">
      <n-card :bordered="false">
        <div class="gacha-container">
          <div class="gacha-type-selector">
            <n-radio-group v-model:value="gachaType" name="gachaType">
              <n-radio-button value="all">综合池</n-radio-button>
              <n-radio-button value="equipment">装备池</n-radio-button>
              <n-radio-button value="pet">灵宠池</n-radio-button>
            </n-radio-group>
          </div>
          <div class="spirit-stones">
            <n-statistic label="灵石" :value="playerStore.spiritStones" />
          </div>
          <div class="gacha-item-container">
            <div
              class="gacha-item"
              :class="{
                shake: isShaking,
                open: isOpening
              }"
            >
              {{ types[gachaType] }}
            </div>
          </div>
          <div class="gacha-buttons">
            <n-space vertical>
              <n-space justify="center">
                <n-button
                  type="primary"
                  v-for="(item, index) in [1, 10, 50, 100]"
                  :key="index"
                  @click="performGacha(item)"
                  :disabled="
                    playerStore.spiritStones < (playerStore.wishlistEnabled ? item * 200 : item * 100) || isDrawing
                  "
                >
                  抽{{ item }}次 ({{ playerStore.wishlistEnabled ? item * 200 : item * 100 }}灵石)
                </n-button>
              </n-space>
              <n-space justify="center">
                <n-button quaternary circle size="small" @click="showProbabilityInfo = true">
                  <template #icon>
                    <n-icon>
                      <Help />
                    </n-icon>
                  </template>
                </n-button>
                <n-button quaternary circle size="small" @click="showWishlistSettings = true">
                  <template #icon>
                    <n-icon>
                      <HeartOutline />
                    </n-icon>
                  </template>
                </n-button>
                <n-button quaternary circle size="small" @click="showAutoSettings = true">
                  <template #icon>
                    <n-icon>
                      <SettingsOutline />
                    </n-icon>
                  </template>
                </n-button>
              </n-space>
            </n-space>
          </div>
          <!-- 抽卡结果弹窗 -->
          <n-modal
            v-model:show="showResult"
            preset="dialog"
            title="抽卡结果"
            :style="{ maxWidth: '90vw', width: '800px' }"
          >
            <n-card :bordered="false">
              <!-- 筛选区域 -->
              <div class="filter-section" v-if="gachaType !== 'all'">
                <n-space align="center" justify="center" :wrap="true" :size="16">
                  <n-select
                    v-model:value="selectedQuality"
                    placeholder="装备品质筛选"
                    clearable
                    :options="equipmentQualityOptions"
                    :style="{ width: '180px' }"
                    @update:value="currentPage = 1"
                    v-if="gachaType === 'equipment'"
                  ></n-select>
                  <n-select
                    v-model:value="selectedRarity"
                    placeholder="灵宠品质筛选"
                    clearable
                    :options="petRarityOptions"
                    :style="{ width: '180px' }"
                    @update:value="currentPage = 1"
                    v-if="gachaType === 'pet'"
                  ></n-select>
                </n-space>
              </div>
              <n-space justify="center">
                <n-button
                  type="primary"
                  @click="performGacha(gachaNumber)"
                  :disabled="
                    playerStore.spiritStones < (playerStore.wishlistEnabled ? gachaNumber * 200 : gachaNumber * 100) ||
                    isDrawing
                  "
                >
                  再抽<NumericValue :value="gachaNumber" />次 (<NumericValue :value="playerStore.wishlistEnabled ? gachaNumber * 200 : gachaNumber * 100" />灵石)
                </n-button>
              </n-space>
              <div class="result-grid">
                <div
                  v-for="item in currentPageResults"
                  :key="item.id"
                  :class="[
                    'result-item',
                    {
                      'wish-bonus':
                        playerStore.wishlistEnabled &&
                        ((item.type !== 'pet' && item.type !== 'pill' && playerStore.selectedWishEquipQuality === item.quality) ||
                          (item.type === 'pet' && playerStore.selectedWishPetRarity === item.rarity))
                    }
                  ]"
                  :style="{
                    borderColor: getItemBorderColor(item)
                  }"
                >
                  <h4>{{ item.name }}</h4>
                  <p>品质：{{ getItemQualityName(item) }}</p>
                  <p v-if="item.type !== 'pet' && item.type !== 'pill'">类型：{{ equipmentTypes[item.type].name }}</p>
                  <p v-else-if="item.type === 'pet'">{{ item.description || '暂无描述' }}</p>
                </div>
              </div>
              <template #footer>
                <n-space justify="center">
                  <n-pagination
                    v-model:page="currentPage"
                    :page-slot="6"
                    :page-count="totalPages"
                    :page-size="pageSize"
                  />
                </n-space>
              </template>
            </n-card>
          </n-modal>
          <!-- 概率说明弹窗 -->
          <n-modal v-model:show="showProbabilityInfo" preset="dialog" title="抽卡概率说明">
            <n-tabs type="segment" animated>
              <!-- 综合池概率 -->
              <n-tab-pane name="all" tab="综合池">
                <n-card>
                  <n-space vertical>
                    <n-divider>综合概率</n-divider>
                    <div class="probability-bars">
                      <div class="prob-item">
                        <div class="prob-label">
                          <span>装备</span>
                        </div>
                        <!-- 总体分布 -->
                        <n-progress
                          type="line"
                          :percentage="50"
                          indicator-placement="inside"
                          color="#2080f0"
                          :height="20"
                          :border-radius="4"
                        />
                        <div class="prob-label">
                          <span>灵宠</span>
                        </div>
                        <n-progress
                          type="line"
                          :percentage="50"
                          indicator-placement="inside"
                          color="#f0a020"
                          :height="20"
                          :border-radius="4"
                        />
                      </div>
                    </div>
                    <!-- 装备概率详情 -->
                    <n-divider>装备品质概率</n-divider>
                    <div class="probability-bars">
                      <div
                        v-for="(probability, quality) in getAllPoolProbabilities(playerStore.level || 1).equipment"
                        :key="quality"
                        class="prob-item"
                      >
                        <div class="prob-label">
                          <span :style="{ color: equipmentQualities[quality].color }">
                            {{ equipmentQualities[quality].name }}
                          </span>
                        </div>
                        <n-progress
                          type="line"
                          :percentage="probability * 100"
                          indicator-placement="inside"
                          :color="equipmentQualities[quality].color"
                          :height="20"
                          :border-radius="4"
                          :show-indicator="true"
                        >
                          <template #indicator><NumericValue :value="(probability * 100).toFixed(1)" />%</template>
                        </n-progress>
                      </div>
                    </div>
                    <!-- 灵宠概率详情 -->
                    <n-divider>灵宠品质概率</n-divider>
                    <div class="probability-bars">
                      <div
                        v-for="(probability, rarity) in getAllPoolProbabilities(playerStore.level || 1).pet"
                        :key="rarity"
                        class="prob-item"
                      >
                        <div class="prob-label">
                          <span :style="{ color: petRarities[rarity].color }">
                            {{ petRarities[rarity].name }}
                          </span>
                        </div>
                        <n-progress
                          type="line"
                          :percentage="probability * 100"
                          :indicator-placement="'inside'"
                          :color="petRarities[rarity].color"
                          :height="20"
                          :border-radius="4"
                          :show-indicator="true"
                        >
                          <template #indicator><NumericValue :value="(probability * 100).toFixed(1)" />%</template>
                        </n-progress>
                      </div>
                    </div>
                  </n-space>
                </n-card>
              </n-tab-pane>
              <!-- 装备池概率 -->
              <n-tab-pane name="equipment" tab="装备池">
                <n-card>
                  <div class="probability-bars">
                    <div
                      v-for="(probability, quality) in getAdjustedEquipProbabilities()"
                      :key="quality"
                      class="prob-item"
                    >
                      <div class="prob-label">
                        <span :style="{ color: equipmentQualities[quality].color }">
                          {{ equipmentQualities[quality].name }}
                        </span>
                      </div>
                      <n-progress
                        type="line"
                        :percentage="probability * 100"
                        :indicator-placement="'inside'"
                        :color="equipmentQualities[quality].color"
                        :height="20"
                        :border-radius="4"
                        :class="{
                          'wish-bonus': playerStore.wishlistEnabled && playerStore.selectedWishEquipQuality === quality
                        }"
                        :show-indicator="true"
                      >
                        <template #indicator><NumericValue :value="(probability * 100).toFixed(1)" />%</template>
                      </n-progress>
                    </div>
                  </div>
                </n-card>
              </n-tab-pane>
              <!-- 灵宠池概率 -->
              <n-tab-pane name="pet" tab="灵宠池">
                <n-card>
                  <div class="probability-bars">
                    <div v-for="(probability, rarity) in getAdjustedPetProbabilities()" :key="rarity" class="prob-item">
                      <div class="prob-label">
                        <span :style="{ color: petRarities[rarity].color }">
                          {{ petRarities[rarity].name }}
                        </span>
                      </div>
                      <n-progress
                        type="line"
                        :percentage="probability * 100"
                        :indicator-placement="'inside'"
                        :class="{
                          'wish-bonus': playerStore.wishlistEnabled && playerStore.selectedWishPetRarity === rarity
                        }"
                        :color="petRarities[rarity].color"
                        :height="20"
                        :border-radius="4"
                        :show-indicator="true"
                      >
                        <template #indicator><NumericValue :value="(probability * 100).toFixed(1)" />%</template>
                      </n-progress>
                    </div>
                  </div>
                </n-card>
              </n-tab-pane>
            </n-tabs>
          </n-modal>
          <!-- 心愿单设置弹窗 -->
          <n-modal v-model:show="showWishlistSettings" preset="dialog" title="心愿单设置" style="width: 800px">
            <n-card :bordered="false">
              <n-space vertical>
                <n-switch v-model:value="playerStore.wishlistEnabled">
                  <template #checked>心愿单已启用</template>
                  <template #unchecked>心愿单已禁用</template>
                </n-switch>
                <n-divider>装备品质心愿</n-divider>
                <n-select
                  v-model:value="playerStore.selectedWishEquipQuality"
                  :options="equipmentQualityOptions"
                  clearable
                  placeholder="选择装备品质"
                  :disabled="!playerStore.wishlistEnabled"
                >
                </n-select>
                <n-divider>灵宠品质心愿</n-divider>
                <n-select
                  v-model:value="playerStore.selectedWishPetRarity"
                  :options="petRarityOptions"
                  clearable
                  placeholder="选择灵宠品质"
                  :disabled="!playerStore.wishlistEnabled"
                >
                </n-select>
                <n-alert type="info" title="心愿单说明">
                  启用心愿单后，所需灵石会翻倍,
                  选中的品质将根据其基础概率获得不同程度的概率提升（基础概率越低，提升越高）。每次只能选择一个装备品质和一个灵宠品质作为心愿。
                </n-alert>
              </n-space>
            </n-card>
          </n-modal>
          <n-modal v-model:show="showAutoSettings" preset="dialog" title="自动处理设置" style="width: 800px">
            <n-card :bordered="false">
              <n-space vertical>
                <n-divider>装备自动出售</n-divider>
                <n-checkbox-group v-model:value="playerStore.autoSellQualities" @update:value="handleAutoSellChange">
                  <n-space wrap>
                    <n-checkbox
                      value="all"
                      :disabled="
                        !!playerStore.autoSellQualities?.length && !playerStore.autoSellQualities.includes('all')
                      "
                    >
                      全部品阶
                    </n-checkbox>
                    <n-checkbox
                      v-for="(quality, key) in equipmentQualities"
                      :key="key"
                      :value="key"
                      :disabled="playerStore.autoSellQualities?.includes('all')"
                    >
                      <span :style="{ color: quality.color }">{{ quality.name }}</span>
                    </n-checkbox>
                  </n-space>
                </n-checkbox-group>
                <n-divider>灵宠自动放生</n-divider>
                <n-checkbox-group
                  v-model:value="playerStore.autoReleaseRarities"
                  @update:value="handleAutoReleaseChange"
                >
                  <n-space wrap>
                    <n-checkbox
                      value="all"
                      :disabled="
                        !!playerStore.autoReleaseRarities?.length && !playerStore.autoReleaseRarities.includes('all')
                      "
                    >
                      全部品质
                    </n-checkbox>
                    <n-checkbox
                      v-for="(rarity, key) in petRarities"
                      :key="key"
                      :value="key"
                      :disabled="playerStore.autoReleaseRarities?.includes('all')"
                    >
                      <span :style="{ color: rarity.color }">{{ rarity.name }}</span>
                    </n-checkbox>
                  </n-space>
                </n-checkbox-group>
              </n-space>
            </n-card>
            <template #footer>
              <n-space justify="end">
                <n-button @click="showAutoSettings = false">关闭</n-button>
              </n-space>
            </template>
          </n-modal>
        </div>
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
  import NumericValue from '../components/NumericValue.vue'

  import { usePlayerStore } from '../stores/player'
  import { computed, ref, watch } from 'vue'
  import { useMessage } from 'naive-ui'
  import { Help, HeartOutline, SettingsOutline } from '@vicons/ionicons5'
  import type { Equipment, EquipmentQuality, EquipmentSlot, GameItem, Pet, PetRarity, Stats } from '../types/game'

  type GachaType = 'all' | 'equipment' | 'pet'
  type PetTemplate = Pick<Pet, 'name' | 'description'>
  type QualityConfig = { name: string; color: string; statMod: number; maxStatMod: number }
  type EquipmentTypeConfig = { name: string; slot: EquipmentSlot; prefixes: string[] }
  type PetRarityConfig = { name: string; color: string; probability: number; essenceBonus: number }
  type StatRange = { name: string; min: number; max: number }
  type PetStatRange = { min: number; max: number; isPercentage?: boolean; useBase?: boolean; multiplier?: number }
  type RarityMultiplier = { base: number; percent: number }

  const playerStore = usePlayerStore()
  const message = useMessage()

  // 抽卡类型
  const gachaType = ref<GachaType>('all') // 'equipment'、'pet' 或 'all'
  // 抽卡动画状态
  const isShaking = ref(false)
  const isOpening = ref(false)
  const showResult = ref(false)
  const gachaResult = ref<GameItem[] | null>(null)
  const showProbabilityInfo = ref(false)
  const isDrawing = ref(false)

  // 结果弹窗相关
  const currentPage = ref(1)
  const pageSize = ref(12)
  const selectedQuality = ref<EquipmentQuality | 'all' | null>('all') // 选中的装备品质
  const selectedRarity = ref<PetRarity | 'all' | null>('all') // 选中的灵宠品质
  const autoReleasedCount = ref(0) // 自动放生灵宠次数
  const autoSoldIncome = ref(0) // 自动出售装备获得的强化石数量
  const autoSoldCount = ref(0) // 自动出售装备的数量
  const showAutoSettings = ref(false) // 自动设置开关
  const showWishlistSettings = ref(false) // 心愿单弹窗

  // 心愿单概率提升配置
  const wishlistBonus = {
    equipment: (quality: EquipmentQuality) => Math.min(1.0, 0.2 / getEquipProbabilities[quality]),
    pet: (rarity: PetRarity) => Math.min(1.0, 0.2 / petRarities[rarity].probability)
  }

  // 装备品质
  const equipmentQualities = {
    common: { name: '凡品', color: '#9e9e9e', statMod: 1.0, maxStatMod: 1.5 },
    uncommon: { name: '下品', color: '#4caf50', statMod: 1.2, maxStatMod: 2.0 },
    rare: { name: '中品', color: '#2196f3', statMod: 1.5, maxStatMod: 2.5 },
    epic: { name: '上品', color: '#9c27b0', statMod: 2.0, maxStatMod: 3.0 },
    legendary: { name: '极品', color: '#ff9800', statMod: 2.5, maxStatMod: 3.5 },
    mythic: { name: '仙品', color: '#e91e63', statMod: 3.0, maxStatMod: 4.0 }
  } satisfies Record<EquipmentQuality, QualityConfig>

  // 装备类型
  const equipmentTypes: Record<EquipmentSlot, EquipmentTypeConfig> = {
    weapon: {
      name: '武器',
      slot: 'weapon',
      prefixes: ['九天', '太虚', '混沌', '玄天', '紫霄', '青冥', '赤炎', '幽冥']
    },
    head: { name: '头部', slot: 'head', prefixes: ['天灵', '玄冥', '紫金', '青玉', '赤霞', '幽月', '星辰', '云霄'] },
    body: { name: '衣服', slot: 'body', prefixes: ['九霄', '太素', '混元', '玄阳', '紫薇', '青龙', '赤凤', '幽冥'] },
    legs: { name: '裤子', slot: 'legs', prefixes: ['天罡', '玄武', '紫电', '青云', '赤阳', '幽灵', '星光', '云雾'] },
    feet: { name: '鞋子', slot: 'feet', prefixes: ['天行', '玄风', '紫霞', '青莲', '赤焰', '幽影', '星步', '云踪'] },
    shoulder: {
      name: '肩甲',
      slot: 'shoulder',
      prefixes: ['天护', '玄甲', '紫雷', '青锋', '赤羽', '幽岚', '星芒', '云甲']
    },
    hands: { name: '手套', slot: 'hands', prefixes: ['天罗', '玄玉', '紫晶', '青钢', '赤金', '幽银', '星铁', '云纹'] },
    wrist: { name: '护腕', slot: 'wrist', prefixes: ['天绝', '玄铁', '紫玉', '青石', '赤铜', '幽钢', '星晶', '云纱'] },
    necklace: {
      name: '项链',
      slot: 'necklace',
      prefixes: ['天珠', '玄圣', '紫灵', '青魂', '赤心', '幽魄', '星魂', '云珠']
    },
    ring1: { name: '戒指1', slot: 'ring1', prefixes: ['天命', '玄命', '紫命', '青命', '赤命', '幽命', '星命', '云命'] },
    ring2: { name: '戒指2', slot: 'ring2', prefixes: ['天道', '玄道', '紫道', '青道', '赤道', '幽道', '星道', '云道'] },
    belt: { name: '腰带', slot: 'belt', prefixes: ['天系', '玄系', '紫系', '青系', '赤系', '幽系', '星系', '云系'] },
    artifact: {
      name: '法宝',
      slot: 'artifact',
      prefixes: ['天宝', '玄宝', '紫宝', '青宝', '赤宝', '幽宝', '星宝', '云宝']
    }
  }

  const equipmentQualityKeys = Object.keys(equipmentQualities) as EquipmentQuality[]
  const isEquipmentQuality = (value: string): value is EquipmentQuality => equipmentQualityKeys.includes(value as EquipmentQuality)

  const equipmentTypes2: EquipmentSlot[] = [
    'weapon',
    'head',
    'body',
    'legs',
    'feet',
    'shoulder',
    'hands',
    'wrist',
    'necklace',
    'ring1',
    'ring2',
    'belt',
    'artifact'
  ]

  // 生成随机装备
  const generateEquipment = (level: number, type: EquipmentSlot | null = null, quality: EquipmentQuality | null = null): Equipment => {
    // 随机选择装备类型和品质，使用固定概率
    const selectedType = type ?? equipmentTypes2[Math.floor(Math.random() * equipmentTypes2.length)]!
    let selectedQuality = quality
    if (!selectedQuality) {
      const roll = Math.random()
      if (roll < 0.35) selectedQuality = 'common'
      else if (roll < 0.65) selectedQuality = 'uncommon'
      else if (roll < 0.82) selectedQuality = 'rare'
      else if (roll < 0.93) selectedQuality = 'epic'
      else if (roll < 0.98) selectedQuality = 'legendary'
      else selectedQuality = 'mythic'
    }
    const selectedEquipmentQuality = selectedQuality
    // 随机生成装备等级（1到玩家当前等级之间）
    const randomLevel = Math.floor(Math.random() * level) + 1
    // 基础属性计算
    const baseStats: Stats = {}
    const qualityMod = equipmentQualities[selectedEquipmentQuality].statMod
    const levelMod = 1 + randomLevel * 0.1
    Object.entries(equipmentBaseStats[selectedType]).forEach(([stat, config]) => {
      const base = config.min + Math.random() * (config.max - config.min)
      const value = base * qualityMod * levelMod
      // 对百分比属性进行特殊处理
      if (
        ['critRate', 'critDamageBoost', 'dodgeRate', 'vampireRate', 'finalDamageBoost', 'finalDamageReduce'].includes(
          stat
        )
      ) {
        baseStats[stat] = Math.round(value * 1) / 100 // 保留两位小数
      } else {
        baseStats[stat] = Math.round(value)
      }
    })
    return {
      id: Date.now() + Math.random(),
      name: generateEquipmentName(selectedType, selectedEquipmentQuality),
      type: selectedType,
      slot: selectedType,
      quality: selectedEquipmentQuality,
      level: randomLevel,
      requiredRealm: randomLevel,
      stats: baseStats,
      equipType: selectedType,
      qualityInfo: equipmentQualities[selectedEquipmentQuality]
    }
  }
  // 生成装备名称
  const generateEquipmentName = (type: EquipmentSlot, quality: EquipmentQuality): string => {
    const typeInfo = equipmentTypes[type]
    const prefix = typeInfo.prefixes[Math.floor(Math.random() * typeInfo.prefixes.length)]
    const suffixes = ['', '·真', '·极', '·道', '·天', '·仙', '·圣', '·神']
    const suffix =
      quality === 'mythic'
        ? suffixes[7]
        : quality === 'legendary'
        ? suffixes[6]
        : quality === 'epic'
        ? suffixes[5]
        : quality === 'rare'
        ? suffixes[4]
        : quality === 'uncommon'
        ? suffixes[3]
        : suffixes[0]
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
      attack: { name: '攻击力', min: 0.1, max: 0.3 },
      critRate: { name: '暴击率', min: 0.1, max: 0.3 },
      comboRate: { name: '连击率', min: 0.1, max: 0.3 }
    }
  } satisfies Record<EquipmentSlot, Record<string, StatRange>>

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
  } satisfies Record<PetRarity, PetRarityConfig>

  const petRarityKeys = Object.keys(petRarities) as PetRarity[]
  const isPetRarity = (value: string): value is PetRarity => petRarityKeys.includes(value as PetRarity)

  const getItemBorderColor = (item: GameItem): string => {
    if (item.type === 'pet') return isPetRarity(item.rarity) ? petRarities[item.rarity].color : '#9e9e9e'
    if (item.type === 'pill') return '#9e9e9e'
    return isEquipmentQuality(item.quality) ? equipmentQualities[item.quality].color : '#9e9e9e'
  }

  const getItemQualityName = (item: GameItem): string => {
    if (item.type === 'pet') return isPetRarity(item.rarity) ? petRarities[item.rarity].name : '未知'
    if (item.type === 'pill') return '丹药'
    return isEquipmentQuality(item.quality) ? equipmentQualities[item.quality].name : '未知'
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
      { name: '狻犴', description: '龙之五子，形似狮子，喜静好坐，常立于香炉' },
      { name: '霸下', description: '龙之六子，形似龟，力大无穷，常背负石碑' },
      { name: '狴犴', description: '龙之七子，形似虎，明辨是非，常立于狱门' },
      { name: '负屃', description: '龙之八子，形似龙，雅好诗文，常盘于碑顶' },
      { name: '螭吻', description: '龙之九子，形似鱼，能吞火，常立于屋脊' }
    ],
    mystic: [
      { name: '火凤凰', description: '浴火重生的永恒之鸟' },
      { name: '雷鹰', description: '雷电的猛禽' },
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
  } satisfies Record<PetRarity, PetTemplate[]>

  const getRarityMultiplier = (rarity: PetRarity): RarityMultiplier => {
    const multipliers: Record<PetRarity, RarityMultiplier> = {
      divine: { base: 5, percent: 2 },
      celestial: { base: 4, percent: 1.8 },
      mystic: { base: 3, percent: 1.6 },
      spiritual: { base: 2, percent: 1.4 },
      mortal: { base: 1, percent: 1 }
    }
    return multipliers[rarity]
  }

  const generateRandomValue = (min: number, max: number, isPercentage = false): number => {
    const value = min + Math.random() * (max - min)
    return isPercentage ? Math.min(1, Math.round(value * 100) / 100) : Math.round(value)
  }

  const combatAttributes = (rarity: PetRarity): Stats => {
    const multiplier = getRarityMultiplier(rarity)
    // 基础属性配置
    const baseStats: Record<string, PetStatRange> = {
      // 基础属性
      attack: { min: 10, max: 15, useBase: true },
      health: { min: 100, max: 120, useBase: true },
      defense: { min: 5, max: 8, useBase: true },
      speed: { min: 10, max: 15, useBase: true, multiplier: 0.6 },
      // 战斗属性
      critRate: { min: 0.05, max: 0.1, isPercentage: true }, // 暴击率
      comboRate: { min: 0.05, max: 0.1, isPercentage: true }, // 连击率
      counterRate: { min: 0.05, max: 0.1, isPercentage: true }, // 反击率
      stunRate: { min: 0.05, max: 0.1, isPercentage: true }, // 眩晕率
      dodgeRate: { min: 0.05, max: 0.1, isPercentage: true }, // 闪避率
      vampireRate: { min: 0.05, max: 0.1, isPercentage: true }, // 吸血率
      // 战斗抗性
      critResist: { min: 0.05, max: 0.1, isPercentage: true }, // 抗暴击
      comboResist: { min: 0.05, max: 0.1, isPercentage: true }, // 抗连击
      counterResist: { min: 0.05, max: 0.1, isPercentage: true }, // 抗反击
      stunResist: { min: 0.05, max: 0.1, isPercentage: true }, // 抗眩晕
      dodgeResist: { min: 0.05, max: 0.1, isPercentage: true }, // 抗闪避
      vampireResist: { min: 0.05, max: 0.1, isPercentage: true }, // 抗吸血
      // 特殊属性
      healBoost: { min: 0.05, max: 0.1, isPercentage: true }, // 强化治疗
      critDamageBoost: { min: 0.05, max: 0.1, isPercentage: true }, // 强化爆伤
      critDamageReduce: { min: 0.05, max: 0.1, isPercentage: true }, // 弱化爆伤
      finalDamageBoost: { min: 0.05, max: 0.1, isPercentage: true }, // 最终增伤
      finalDamageReduce: { min: 0.05, max: 0.1, isPercentage: true }, // 最终减伤
      combatBoost: { min: 0.05, max: 0.1, isPercentage: true }, // 战斗属性提升
      resistanceBoost: { min: 0.05, max: 0.1, isPercentage: true } // 战斗抗性提升
    }
    const attributes: Stats = {}
    // 计算每个属性的值
    Object.entries(baseStats).forEach(([key, config]) => {
      if (config.isPercentage) {
        // 百分比属性使用percent倍率
        attributes[key] = generateRandomValue(config.min * multiplier.percent, config.max * multiplier.percent, true)
      } else {
        // 基础属性使用base倍率
        const baseMultiplier = config.useBase ? multiplier.base : multiplier.percent
        const finalMultiplier = config.multiplier ? baseMultiplier * config.multiplier : baseMultiplier
        attributes[key] = generateRandomValue(config.min * finalMultiplier, config.max * finalMultiplier)
      }
    })
    return attributes
  }

  // 根据境界调整装备品质概率
  const getEquipProbabilities: Record<EquipmentQuality, number> = {
    common: 0.5, // 凡品 50%
    uncommon: 0.3, // 下品 30%
    rare: 0.12, // 中品 12%
    epic: 0.05, // 上品 5%
    legendary: 0.02, // 极品 2%
    mythic: 0.01 // 仙品 1%
  }

  // 根据心愿单调整装备概率
  const getAdjustedEquipProbabilities = (): Record<EquipmentQuality, number> => {
    const baseProbs = { ...getEquipProbabilities }
    const selectedQuality = playerStore.selectedWishEquipQuality
    if (playerStore.wishlistEnabled && selectedQuality && isEquipmentQuality(selectedQuality)) {
      const quality = selectedQuality
      const bonus = wishlistBonus.equipment(quality)
      // 增加选中品质的概率
      baseProbs[quality] *= 1 + bonus
      // 按比例降低其他品质的概率
      const totalOtherProb = equipmentQualityKeys.filter(q => q !== quality).reduce((sum, q) => sum + baseProbs[q], 0)
      const reductionFactor = (1 - baseProbs[quality]) / totalOtherProb
      for (const otherQuality of equipmentQualityKeys) {
        if (otherQuality !== quality) baseProbs[otherQuality] *= reductionFactor
      }
    }
    return baseProbs
  }

  // 根据心愿单调整灵宠概率
  const getAdjustedPetProbabilities = (): Record<PetRarity, number> => {
    const baseProbs: Record<PetRarity, number> = {
      divine: petRarities.divine.probability,
      celestial: petRarities.celestial.probability,
      mystic: petRarities.mystic.probability,
      spiritual: petRarities.spiritual.probability,
      mortal: petRarities.mortal.probability
    }
    const selectedRarity = playerStore.selectedWishPetRarity
    if (playerStore.wishlistEnabled && selectedRarity && isPetRarity(selectedRarity)) {
      const rarity = selectedRarity
      const bonus = wishlistBonus.pet(rarity)
      // 增加选中品质的概率
      baseProbs[rarity] *= 1 + bonus
      // 按比例降低其他品质的概率
      const totalOtherProb = petRarityKeys.filter(r => r !== rarity).reduce((sum, r) => sum + baseProbs[r], 0)
      const reductionFactor = (1 - baseProbs[rarity]) / totalOtherProb
      for (const otherRarity of petRarityKeys) {
        if (otherRarity !== rarity) baseProbs[otherRarity] *= reductionFactor
      }
    }
    return baseProbs
  }

  // 修改抽取单个装备的函数
  const drawSingleEquip = () => {
    const random = Math.random()
    let accumulatedProb = 0
    const currentProbs = getAdjustedEquipProbabilities()
    for (const quality of equipmentQualityKeys) {
      const probability = currentProbs[quality]
      accumulatedProb += probability
      if (random <= accumulatedProb) {
        const types = Object.keys(equipmentTypes) as EquipmentSlot[]
        const type = types[Math.floor(Math.random() * types.length)]
        return generateEquipment(playerStore.level || 1, type, quality)
      }
    }
    return generateEquipment(playerStore.level || 1, null, 'common')
  }

  const createPet = (rarity: PetRarity, template: PetTemplate): Pet => {
    const upgradeItemCount: Record<PetRarity, number> = {
      divine: 5,
      celestial: 4,
      mystic: 3,
      spiritual: 2,
      mortal: 1
    }
    return {
      ...template,
      id: Date.now() + Math.random(),
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
      upgradeItems: upgradeItemCount[rarity],
      combatAttributes: combatAttributes(rarity)
    }
  }

  const drawSinglePet = (): Pet => {
    const random = Math.random()
    let accumulatedProb = 0
    const currentProbs = getAdjustedPetProbabilities()
    for (const rarity of petRarityKeys) {
      accumulatedProb += currentProbs[rarity]
      if (random <= accumulatedProb) {
        const pool = petPool[rarity]
        return createPet(rarity, pool[Math.floor(Math.random() * pool.length)]!)
      }
    }
    const pool = petPool.mortal
    return createPet('mortal', pool[Math.floor(Math.random() * pool.length)]!)
  }

  // 综合池概率配置
  const getAllPoolProbabilities = (_level: number): { equipment: Record<EquipmentQuality, number>; pet: Record<PetRarity, number> } => {
    const adjustedEquipProbs: Record<EquipmentQuality, number> = {
      common: getEquipProbabilities.common * 0.5,
      uncommon: getEquipProbabilities.uncommon * 0.5,
      rare: getEquipProbabilities.rare * 0.5,
      epic: getEquipProbabilities.epic * 0.5,
      legendary: getEquipProbabilities.legendary * 0.5,
      mythic: getEquipProbabilities.mythic * 0.5
    }
    const adjustedPetProbs: Record<PetRarity, number> = {
      divine: petRarities.divine.probability * 0.5,
      celestial: petRarities.celestial.probability * 0.5,
      mystic: petRarities.mystic.probability * 0.5,
      spiritual: petRarities.spiritual.probability * 0.5,
      mortal: petRarities.mortal.probability * 0.5
    }
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
      for (const quality of equipmentQualityKeys) {
        const probability = probs.equipment[quality]
        accumulatedProb += probability
        if (random * 2 <= accumulatedProb) {
          const type = equipmentTypes2[Math.floor(Math.random() * equipmentTypes2.length)]!
          return {
            ...generateEquipment(playerStore.level || 1, type, quality),
            type,
            equipType: type
          }
        }
      }
      // 如果没有命中任何概率，返回最低品质的装备
      const type = equipmentTypes2[Math.floor(Math.random() * equipmentTypes2.length)]!
      return {
        ...generateEquipment(playerStore.level || 1, type, 'common'),
        type,
        equipType: type
      }
    } else {
      // 抽灵宠
      let accumulatedProb = 0
      for (const rarity of petRarityKeys) {
        accumulatedProb += petRarities[rarity].probability
        if ((random - 0.5) * 2 <= accumulatedProb) {
          const pool = petPool[rarity]
          return createPet(rarity, pool[Math.floor(Math.random() * pool.length)]!)
        }
      }
      const pool = petPool.mortal
      return createPet('mortal', pool[Math.floor(Math.random() * pool.length)]!)
    }
  }

  const gachaNumber = ref(1)

  // 执行抽卡
  const performGacha = async (times: number) => {
    gachaNumber.value = times
    showResult.value = false
    const cost = playerStore.wishlistEnabled ? times * 200 : times * 100
    if (playerStore.spiritStones < cost) {
      message.error('灵石不足！')
      return
    }
    if (gachaType.value != 'equipment' && playerStore.items.filter(item => item.type === 'pet').length >= 100) {
      message.error('灵宠背包已满，请先处理一些灵宠')
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
    const results = Array(times)
      .fill(undefined)
      .map(() => {
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
        // 检查是否需要自动放生
        if (
          playerStore.autoReleaseRarities.length > 0 &&
          (playerStore.autoReleaseRarities.includes('all') || playerStore.autoReleaseRarities.includes(item.rarity))
        ) {
          autoReleasedCount.value++
          return // 不添加到背包
        }
      } else if (equipmentTypes2.includes(item.type)) {
        // 检查是否需要自动出售
        if (
          playerStore.autoSellQualities.length > 0 &&
          (playerStore.autoSellQualities.includes('all') || playerStore.autoSellQualities.includes(item.quality))
        ) {
          // 计算出售价格
          const qualityPrices: Record<EquipmentQuality, number> = {
            mythic: 6,
            legendary: 5,
            epic: 4,
            rare: 3,
            uncommon: 2,
            common: 1
          }
          const basePrice = isEquipmentQuality(item.quality) ? qualityPrices[item.quality] : 1
          playerStore.reinforceStones += basePrice
          autoSoldCount.value++
          autoSoldIncome.value += basePrice
          return // 不添加到背包
        }
      }
      playerStore.items.push({
        ...item,
        id: Date.now() + Math.random()
      })
    })
    // 显示自动处理结果通知
    if (autoSoldCount.value) {
      message.success(`自动出售了 ${autoSoldCount.value} 件装备，获得 ${autoSoldIncome.value} 强化石`)
    }
    if (autoReleasedCount.value) {
      message.success(`自动放生了 ${autoReleasedCount.value} 只灵宠`)
    }
    // 保存数据
    playerStore.saveData()
    // 显示结果
    gachaResult.value = results
    currentPage.value = 1
    selectedRarity.value = null
    selectedQuality.value = null
    isOpening.value = false
    showResult.value = true
    isDrawing.value = false
    // 清空自动处理计数器
    autoSoldCount.value = 0
    autoReleasedCount.value = 0
    autoSoldIncome.value = 0
  }

  // 筛选结果
  const filteredResults = computed(() => {
    if (!gachaResult.value) return []
    return gachaResult.value.filter(item => {
      if (item.type === 'pet') {
        return !selectedRarity.value || item.rarity === selectedRarity.value
      }
      // 装备筛选
      return !selectedQuality.value || (item.type !== 'pill' && item.quality === selectedQuality.value)
    })
  })

  // 当筛选条件改变时重置页码
  watch([selectedQuality, selectedRarity], () => {
    currentPage.value = 1
  })

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

  const equipmentQualityOptions = computed(() => {
    return Object.entries(equipmentQualities).map(([key, value]) => ({
      label: value.name,
      value: key,
      style: { color: value.color }
    }))
  })

  const petRarityOptions = computed(() => {
    return Object.entries(petRarities).map(([key, value]) => ({
      label: value.name,
      value: key,
      style: { color: value.color }
    }))
  })

  const handleAutoSellChange = (rawValues: Array<string | number>) => {
    const values = rawValues.filter((value): value is string => typeof value === 'string')
    if (values.includes('all')) {
      // 如果选中了"全部品阶"，则清空其他选项
      playerStore.autoSellQualities = ['all']
    } else if (values.length > 0) {
      // 如果选中了其他选项，确保移除"全部品阶"
      playerStore.autoSellQualities = values.filter(v => v !== 'all')
    }
  }

  const handleAutoReleaseChange = (rawValues: Array<string | number>) => {
    const values = rawValues.filter((value): value is string => typeof value === 'string')
    if (values.includes('all')) {
      // 如果选中了"全部品质"，则清空其他选项
      playerStore.autoReleaseRarities = ['all']
    } else if (values.length > 0) {
      // 如果选中了其他选项，确保移除"全部品质"
      playerStore.autoReleaseRarities = values.filter(v => v !== 'all')
    }
  }
</script>

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

  .filter-section {
    padding: 16px;
    margin-bottom: 16px;
    background-color: var(--n-card-color);
    border-radius: 8px;
    border: 1px solid var(--n-border-color);
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

  .probability-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .prob-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .prob-label {
    min-width: 60px;
    text-align: right;
  }

  @media screen and (max-width: 768px) {
    .result-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .wishlist-button {
    position: absolute;
    top: 20px;
    right: 20px;
  }

  .wishlist-info {
    margin-top: 16px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
  }

  .wishlist-info ul {
    margin: 8px 0 0 20px;
    padding: 0;
  }

  .wishlist-info li {
    margin: 4px 0;
    color: #666;
  }

  @keyframes rotate-stars {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .wish-bonus {
    position: relative;
    z-index: 1;
  }

  .wish-bonus::before {
    content: '★';
    position: absolute;
    top: -10px;
    right: -10px;
    color: white;
    font-size: 20px;
    text-shadow: 0 0 5px;
    animation: rotate-stars 3s linear infinite;
    transform-origin: center;
  }
</style>
