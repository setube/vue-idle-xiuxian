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
            <n-radio-group v-model:value="gachaType" name="gachaType" :disabled="isDrawing">
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
                    playerStore.spiritStones < (item * drawPrice) || isDrawing
                  "
                >
                  抽{{ item }}次 ({{ item * drawPrice }}灵石)
                </n-button>
              </n-space>
              <n-space justify="center">
                <n-button quaternary circle size="small" aria-label="抽卡概率说明" title="抽卡概率说明" @click="showProbabilityInfo = true">
                  <template #icon>
                    <n-icon>
                      <Help />
                    </n-icon>
                  </template>
                </n-button>
                <n-button quaternary circle size="small" aria-label="心愿单设置" title="心愿单设置" @click="showWishlistSettings = true">
                  <template #icon>
                    <n-icon>
                      <HeartOutline />
                    </n-icon>
                  </template>
                </n-button>
                <n-button quaternary circle size="small" aria-label="自动处理设置" title="自动处理设置" @click="showAutoSettings = true">
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
          <n-button v-if="gachaResult?.length" text @click="showResult = true">查看上次抽取</n-button>
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
                    playerStore.spiritStones < (gachaNumber * drawPrice) ||
                    isDrawing
                  "
                >
                  再抽<NumericValue :value="gachaNumber" />次 (<NumericValue :value="gachaNumber * drawPrice" />灵石)
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
                  <img v-if="item.type === 'pet'" :src="creatureArt(item.name)" width="72" height="72" alt="" /><GearGlyph v-else-if="item.type !== 'pill'" :slot-type="item.type" :item-id="item.id" />
                  <h4>{{ item.name }}</h4>
                  <EquipmentQualityBadge v-if="item.type !== 'pet' && item.type !== 'pill'" :item="item" />
                  <p v-else-if="item.type === 'pet'">灵宠品质：{{ isPetRarity(item.rarity) ? petRarities[item.rarity].name : '未知' }}</p>
                  <template v-if="item.type !== 'pet' && item.type !== 'pill'">
                    <p v-if="autoSoldIds.has(item.id)">已自动出售</p>
                    <p v-else-if="playerStore.equippedArtifacts[item.type]?.id === item.id">已穿戴</p>
                    <template v-else>
                      <EquipmentComparison :candidate="item" :current="playerStore.equippedArtifacts[item.type]" />
                      <n-button size="small" :disabled="playerStore.level < (item.requiredRealm ?? 1)" @click="wearDrawnItem(item)">
                        {{ playerStore.level < (item.requiredRealm ?? 1) ? '境界不足' : '穿戴' }}
                      </n-button>
                    </template>
                  </template>
                  <p v-else-if="item.type === 'pet'">抽取 +{{ playerStore.petEssenceYield(item).draw }} 精华 · {{ autoReleasedIds.has(item.id) ? '已放生 +' : '放生可得 ' }}{{ playerStore.petEssenceYield(item).release }} 精华</p>
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
                        v-for="(probability, quality) in poolOdds.all.equipment"
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
                          indicator-placement="outside"
                          :color="equipmentQualities[quality].color"
                          :height="20"
                          :border-radius="4"
                          :show-indicator="true"
                        >
                          <template #indicator><NumericValue :value="Number((probability * 100).toFixed(3))" />%</template>
                        </n-progress>
                      </div>
                    </div>
                    <!-- 灵宠概率详情 -->
                    <n-divider>灵宠品质概率</n-divider>
                    <div class="probability-bars">
                      <div
                        v-for="(probability, rarity) in poolOdds.all.pet"
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
                          indicator-placement="outside"
                          :color="petRarities[rarity].color"
                          :height="20"
                          :border-radius="4"
                          :show-indicator="true"
                        >
                          <template #indicator><NumericValue :value="Number((probability * 100).toFixed(3))" />%</template>
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
                      v-for="(probability, quality) in poolOdds.equipment.equipment"
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
                        indicator-placement="outside"
                        :color="equipmentQualities[quality].color"
                        :height="20"
                        :border-radius="4"
                        :class="{
                          'wish-bonus': playerStore.wishlistEnabled && playerStore.selectedWishEquipQuality === quality
                        }"
                        :show-indicator="true"
                      >
                        <template #indicator><NumericValue :value="Number((probability * 100).toFixed(3))" />%</template>
                      </n-progress>
                    </div>
                  </div>
                </n-card>
              </n-tab-pane>
              <!-- 灵宠池概率 -->
              <n-tab-pane name="pet" tab="灵宠池">
                <n-card>
                  <div class="probability-bars">
                    <div v-for="(probability, rarity) in poolOdds.pet.pet" :key="rarity" class="prob-item">
                      <div class="prob-label">
                        <span :style="{ color: petRarities[rarity].color }">
                          {{ petRarities[rarity].name }}
                        </span>
                      </div>
                      <n-progress
                        type="line"
                        :percentage="probability * 100"
                        indicator-placement="outside"
                        :class="{
                          'wish-bonus': playerStore.wishlistEnabled && playerStore.selectedWishPetRarity === rarity
                        }"
                        :color="petRarities[rarity].color"
                        :height="20"
                        :border-radius="4"
                        :show-indicator="true"
                      >
                        <template #indicator><NumericValue :value="Number((probability * 100).toFixed(3))" />%</template>
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
                  当前卡池有已选心愿时，每抽消耗 200 灵石，其余情况每抽 100 灵石。
                  选中的品质将根据其基础概率获得不同程度的概率提升（基础概率越低，提升越高）。每次只能选择一个装备品质和一个灵宠品质作为心愿。
                </n-alert>
              </n-space>
            </n-card>
          </n-modal>
          <n-modal v-model:show="showAutoSettings" preset="dialog" title="自动处理设置" style="width: 800px">
            <n-card :bordered="false">
              <n-space vertical>
                <AutoLootSettings kind="gear" expanded />
                <AutoLootSettings kind="pet" expanded />
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
  import AutoLootSettings from '../components/AutoLootSettings.vue'
  import { stonePrices } from '../plugins/equipment-prices' 
  import { creatureArt } from '../plugins/illustrations'
  import GearGlyph from '../components/GearGlyph.vue'
  import { rollEquipmentStats } from '../plugins/equipment-stats'
  import EquipmentComparison from '../components/EquipmentComparison.vue'
  import EquipmentQualityBadge from '../components/EquipmentQualityBadge.vue'
  import { equipmentQualities, isEquipmentQuality } from '../plugins/equipment-quality'
  import NumericValue from '../components/NumericValue.vue'

  import { usePlayerStore } from '../stores/player'
  import { computed, ref, watch } from 'vue'
  import { useMessage } from 'naive-ui'
  import { Help, HeartOutline, SettingsOutline } from '@vicons/ionicons5'
  import type { Equipment, EquipmentQuality, EquipmentSlot, GameItem, Pet, PetRarity, Stats } from '../types/game'

  import { getGachaOdds, rollGacha, type GachaPool } from '../plugins/gacha'
  type PetTemplate = Pick<Pet, 'name' | 'description'>

  type EquipmentTypeConfig = { name: string; slot: EquipmentSlot; prefixes: string[] }
  type PetRarityConfig = { name: string; color: string }
  type PetStatRange = { min: number; max: number; isPercentage?: boolean; useBase?: boolean; multiplier?: number }
  type RarityMultiplier = { base: number; percent: number }

  import { isPet } from '../plugins/companion-ranking'
  const playerStore = usePlayerStore()
  import { useGameNotices } from '../plugins/game-notices'
  const notify = useGameNotices()
  const message = useMessage()

  // 抽卡类型
  const gachaType = ref<GachaPool>('all') // 'equipment'、'pet' 或 'all'
  // 抽卡动画状态
  const isShaking = ref(false)
  const isOpening = ref(false)
  const showResult = ref(false)
  const autoSoldIds = ref(new Set<GameItem['id']>())
  const wearDrawnItem = (item: Equipment) => {
    const owned = playerStore.items.find(candidate => candidate.id === item.id)
    if (!owned || owned.type === 'pet' || owned.type === 'pill') return
    const result = playerStore.equipArtifact(owned, owned.type)
    if (result.success) message.success('已穿戴' + owned.name)
    else message.error(result.message)
  }
  const gachaResult = ref<GameItem[] | null>(null)
  const showProbabilityInfo = ref(false)
  const isDrawing = ref(false)

  // 结果弹窗相关
  const currentPage = ref(1)
  const pageSize = ref(12)
  const selectedQuality = ref<EquipmentQuality | 'all' | null>('all') // 选中的装备品质
  const selectedRarity = ref<PetRarity | 'all' | null>('all') // 选中的灵宠品质
  const autoReleasedIds = ref(new Set<Pet['id']>())
  const showAutoSettings = ref(false) // 自动设置开关
  const showWishlistSettings = ref(false) // 心愿单弹窗

  // 装备类型
  const equipmentTypes: Record<EquipmentSlot, EquipmentTypeConfig> = {
    weapon: {
      name: '武器',
      slot: 'weapon',
      prefixes: ['九天', '太虚', '混沌', '玄天', '紫霄', '青冥', '赤炎', '幽冥']
    },
    head: { name: '头冠', slot: 'head', prefixes: ['天灵', '玄冥', '紫金', '青玉', '赤霞', '幽月', '星辰', '云霄'] },
    body: { name: '衣甲', slot: 'body', prefixes: ['九霄', '太素', '混元', '玄阳', '紫薇', '青龙', '赤凤', '幽冥'] },
    feet: { name: '鞋履', slot: 'feet', prefixes: ['天行', '玄风', '紫霞', '青莲', '赤焰', '幽影', '星步', '云踪'] },
    wrist: { name: '护腕', slot: 'wrist', prefixes: ['天绝', '玄铁', '紫玉', '青石', '赤铜', '幽钢', '星晶', '云纱'] },
    necklace: {
      name: '项链',
      slot: 'necklace',
      prefixes: ['天珠', '玄圣', '紫灵', '青魂', '赤心', '幽魄', '星魂', '云珠']
    },
    ring: { name: '戒指', slot: 'ring', prefixes: ['天命', '玄命', '紫命', '青命', '赤命', '幽命', '星命', '云命'] },
    artifact: {
      name: '法宝',
      slot: 'artifact',
      prefixes: ['天宝', '玄宝', '紫宝', '青宝', '赤宝', '幽宝', '星宝', '云宝']
    }
  }


  import { equipmentSlots } from '../types/game'

  // 生成随机装备
  const generateEquipment = (level: number, selectedEquipmentQuality: EquipmentQuality): Equipment => {
    const selectedType = equipmentSlots[Math.floor(Math.random() * equipmentSlots.length)]!
    // 随机生成装备等级（1到玩家当前等级之间）
    const randomLevel = Math.floor(Math.random() * level) + 1
    const baseStats = rollEquipmentStats(selectedType, selectedEquipmentQuality, randomLevel)
    return {
      id: crypto.getRandomValues(new Uint32Array(4)).join('-'),
      name: generateEquipmentName(selectedType, baseStats),
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
  const generateEquipmentName = (type: EquipmentSlot, stats: Stats): string => {
    const typeInfo = equipmentTypes[type]
    const prefix = typeInfo.prefixes[Math.floor(Math.random() * typeInfo.prefixes.length)]
    if (type === 'ring') return prefix + ('attack' in stats ? '破阵戒' : '镇守戒')
    return prefix + typeInfo.name
  }

  // 灵宠品质配置
  const petRarities = {
    divine: {
      name: '神品',
      color: '#FF0000'
    },
    celestial: {
      name: '仙品',
      color: '#FFD700'
    },
    mystic: {
      name: '玄品',
      color: '#9932CC'
    },
    spiritual: {
      name: '灵品',
      color: '#1E90FF'
    },
    mortal: {
      name: '凡品',
      color: '#32CD32'
    }
  } satisfies Record<PetRarity, PetRarityConfig>

  const petRarityKeys = Object.keys(petRarities) as PetRarity[]
  const isPetRarity = (value: string): value is PetRarity => petRarityKeys.includes(value as PetRarity)

  const getItemBorderColor = (item: GameItem): string => {
    if (item.type === 'pet') return isPetRarity(item.rarity) ? petRarities[item.rarity].color : '#9e9e9e'
    if (item.type === 'pill') return '#9e9e9e'
    return isEquipmentQuality(item.quality) ? equipmentQualities[item.quality].color : '#9e9e9e'
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

  const poolOdds = computed(() => {
    const equipmentWish = playerStore.wishlistEnabled ? playerStore.selectedWishEquipQuality : null
    const petWish = playerStore.wishlistEnabled ? playerStore.selectedWishPetRarity : null
    return {
      all: getGachaOdds('all', equipmentWish, petWish),
      equipment: getGachaOdds('equipment', equipmentWish, petWish),
      pet: getGachaOdds('pet', equipmentWish, petWish)
    }
  })
  const drawPrice = computed(() => poolOdds.value[gachaType.value].price)

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
      id: crypto.getRandomValues(new Uint32Array(4)).join('-'),
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

  const gachaNumber = ref(1)

  // 执行抽卡
  const performGacha = async (times: number) => {
    gachaNumber.value = times
    showResult.value = false
    const cost = times * drawPrice.value
    if (playerStore.spiritStones < cost) {
      message.error('灵石不足！')
      return
    }
    if (gachaType.value != 'equipment' && playerStore.items.filter(item => item.type === 'pet').length >= 100) {
      message.error('灵宠已满，可前往灵宠页整理')
      return
    }
    if (isDrawing.value) return
    isDrawing.value = true
    // 扣除灵石
    playerStore.spiritStones -= cost
    notify('抽奖', '灵石 −' + cost)
    // 生成抽卡结果
    const odds = poolOdds.value[gachaType.value]
    const results = Array.from({ length: times }, () => {
      const draw = rollGacha(odds)
      if (draw.type === 'equipment') return generateEquipment(playerStore.level, draw.quality)
      const pool = petPool[draw.rarity]
      return createPet(draw.rarity, pool[Math.floor(Math.random() * pool.length)]!)
    })
    autoSoldIds.value.clear()
    // 添加到背包
    results.forEach(item => {
      if (item.type === 'pet') {
        playerStore.receiveDrawnPet(item)
        notify('获得灵宠', item.name)
        notify(item.name, '灵宠精华 +' + playerStore.petEssenceYield(item).draw)
        return
      } else if (equipmentSlots.includes(item.type)) {
        // 检查是否需要自动出售
        if (
          playerStore.autoSellQualities.length > 0 &&
          (playerStore.autoSellQualities.includes('all') || playerStore.autoSellQualities.includes(item.quality))
        ) {
          const basePrice = stonePrices.get(item.quality) ?? 1
          playerStore.reinforceStones += basePrice
          autoSoldIds.value.add(item.id)
          notify('自动出售', item.name)
          notify(item.name, '强化石 +' + basePrice)
          return // 不添加到背包
        }
      }
      item.unread = true
      playerStore.items.push(item)
    })
    autoReleasedIds.value = new Set()
    const autoRarities = playerStore.autoReleaseRarities
    if (autoRarities.length) {
      const surplus = playerStore.classifyPets().surplus
      const autoPets = results.filter(isPet).filter(pet => surplus.has(pet.id) &&
        (autoRarities.includes('all') || autoRarities.includes(pet.rarity)))
      if (autoPets.length) {
        const quote = playerStore.quotePetRelease(autoPets)
        const released = playerStore.releasePets(quote)
        if (released.success) {
          autoReleasedIds.value = new Set(quote.ids)
          for (const pet of autoPets) {
            notify('自动放生', pet.name)
            notify(pet.name, '灵宠精华 +' + playerStore.petEssenceYield(pet).release)
          }
        }
      }
    }
    // 保存数据
    playerStore.saveData()
    // 开始抽卡动画
    isShaking.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    isShaking.value = false
    isOpening.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 显示结果
    gachaResult.value = results
    currentPage.value = 1
    selectedRarity.value = null
    selectedQuality.value = null
    isOpening.value = false
    isDrawing.value = false
    // 清空自动处理计数器
  }

  // 筛选结果
  const filteredResults = computed(() => {
    if (!gachaResult.value) return []
    return gachaResult.value.filter(item => {
      if (item.type === 'pet') {
        return !selectedRarity.value || selectedRarity.value === 'all' || item.rarity === selectedRarity.value
      }
      // 装备筛选
      return !selectedQuality.value || selectedQuality.value === 'all' || (item.type !== 'pill' && item.quality === selectedQuality.value)
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
