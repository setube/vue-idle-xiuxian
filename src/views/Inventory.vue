<template>
  <n-layout>
    <n-layout-header v-if="section !== 'character'" bordered>
      <n-page-header>
        <template #title>{{ pageTitle }}</template>
      </n-page-header>
    </n-layout-header>
    <n-layout-content>
      <n-card :bordered="false">
          <section v-if="section === 'character'" class="character-page">
            <header class="character-heading">
              <div><small>{{ getRealmName(playerStore.level).name }}</small><h2>{{ playerStore.name }}</h2></div>
              <button class="pet-switch" type="button" @click="showCompanions = true">
                <img v-if="playerStore.activePet" class="pet-art" :src="creatureArt(playerStore.activePet.name)" alt="" />
                <PawOutline v-else aria-hidden="true" />
                <span><small>出战灵宠</small><strong>{{ playerStore.activePet?.name ?? '选择灵宠' }}</strong></span><span aria-hidden="true">›</span>
              </button>
            </header>
            <div class="attribute-strip">
              <span v-for="(value, stat) in playerStore.effectiveBaseAttributes" :key="stat">{{ getStatName(stat) }} <b>{{ formatStatValue(stat, value) }}</b></span>
              <n-button text :aria-expanded="showAllStats" aria-controls="character-attributes" @click="showAllStats = !showAllStats">全部属性</n-button>
            </div>
            <section v-show="showAllStats" id="character-attributes" aria-label="全部属性">
              <label><input type="checkbox" v-model="showZeroStats" /> 显示零值</label>
              <div class="stat-groups">
                <section v-for="group in visibleStatGroups" :key="group.label">
                  <h3>{{ group.label }}</h3>
                  <dl><template v-for="[key, value] in group.entries" :key="key"><dt>{{ getStatName(key) }}</dt><dd>{{ formatStatValue(key, value) }}</dd></template></dl>
                </section>
                <p v-if="!visibleStatGroups.length">当前战斗、抗性和特殊属性均为零。</p>
              </div>
            </section>
            <div class="loadout-tools"><h3>穿戴装备</h3><n-button size="small" type="primary" @click="previewBestQuality">一键换高品质</n-button></div>
            <EquipmentMap mode="character" :names="equipmentTypes" :equipped="playerStore.equippedArtifacts" :unread="unreadSlots" :guide-weapon="guideWeapon" @select="showEquipmentList" />
            <n-alert v-if="retryReport" type="info" title="秘境重试" class="retry-entry">
              <p>{{ retryReport.result }}</p>
              <n-button type="primary" size="small" @click="$router.push({ path: '/dungeon', query: { retryFloor: retryReport.floor, difficulty: retryReport.difficulty } })">
                重试第 {{ retryReport.floor }} 层
              </n-button>
            </n-alert>
            <p v-if="equipSummary" role="status">{{ equipSummary }}</p>
            <details v-if="summaryDetails"><summary>其余属性变化</summary>{{ summaryDetails }}</details>
            <slot />
          </section>
          <section v-else-if="section === 'bag'" class="bag-page">
              <div v-if="kind === 'loose'">
                <n-space vertical>
                  <AutoLootSettings kind="gear" />
                  <n-space v-if="looseEquipment.length" align="center" justify="space-between">
                    <select v-model="equipmentOrder" class="gear-sort" aria-label="装备排序">
                      <option value="combat">按战力提升</option>
                      <option value="training">按修炼收益</option>
                    </select>
                    <n-button @click="openSaleList(false)">批量卖出</n-button>
                  </n-space>
                  <div v-for="item in looseEquipment.slice((bagPage - 1) * 8, bagPage * 8)" :key="item.id" class="bag-gear">
                    <div class="gear-identity">
                      <GearGlyph :slot-type="item.type" :item-id="item.id" />
                      <div>
                        <n-button text @click="showEquipmentDetails(item)">{{ item.name }}<template v-if="item.enhanceLevel"> +{{ item.enhanceLevel }}</template></n-button>
                        <div class="gear-meta"><EquipmentQualityBadge :item="item" /> · {{ equipmentTypes[item.type] }}</div>
                      </div>
                    </div>
                    <EquipmentComparison :candidate="item" :current="playerStore.equippedArtifacts[item.type]" />
                    <span class="gear-score">{{ equipmentLabel(item) }}</span>
                    <n-button size="small" :disabled="playerStore.level < (item.requiredRealm ?? 1)" @click="equipItem(item)">
                      {{ playerStore.level < (item.requiredRealm ?? 1) ? getRealmName(item.requiredRealm ?? 1).name + '可穿' : '穿戴' }}
                    </n-button>
                  </div>
                  <n-pagination v-if="looseEquipment.length > 8" v-model:page="bagPage" :page-size="8" :item-count="looseEquipment.length" />
                  <n-empty v-if="!looseEquipment.length" description="暂无未穿戴装备" />
                </n-space>
              </div>
          <div v-else-if="kind === 'pets'">
            <AutoLootSettings kind="pet" class="pet-auto-settings" />
            <n-space align="center">
              <n-radio-group v-model:value="petView">
                <n-radio-button value="recommended">推荐出战</n-radio-button>
                <n-radio-button value="evolve">可投喂</n-radio-button>
                <n-radio-button value="surplus">多余灵宠</n-radio-button>
              </n-radio-group>
              <n-select v-model:value="selectedRarityToRelease" :options="options" style="width: 130px" />
              <span>灵宠精华 {{ playerStore.petEssence }}</span>
              <n-button v-if="petView === 'surplus'" @click="openBatchRelease" :disabled="!filteredPets.length">批量放生</n-button>
            </n-space>
            <p v-if="petView === 'surplus'">每种灵宠保留主宠和一只备用；出战、已升级或已有升星进度的灵宠也会保留。</p>
            <n-modal v-model:show="showBatchReleaseConfirm" preset="dialog" title="批量放生确认">
              <p>放生选中的 {{ batchQuote.ids.length }} 只多余灵宠，获得 {{ batchQuote.essence }} 灵宠精华。放生后无法找回。</p>
              <n-space justify="end">
                <n-button @click="showBatchReleaseConfirm = false">取消</n-button>
                <n-button type="error" @click="batchReleasePets">确认放生</n-button>
              </n-space>
            </n-modal>
            <n-pagination
              v-if="filteredPets.length > 12"
              v-model:page="currentPage"
              :page-size="pageSize"
              :item-count="filteredPets.length"
              @update:page-size="onPageSizeChange"
              :page-slot="7"
            />
            <n-grid v-if="displayPets.length" :cols="2" :x-gap="12" :y-gap="8" style="margin-top: 16px">
              <n-grid-item v-for="pet in displayPets" :key="pet.id">
                <n-card hoverable>
                  <template #header>
                    <n-space justify="space-between">
                      <span><img class="pet-art" :src="creatureArt(pet.name)" alt="" />{{ pet.name }}</span>
                      <n-button size="small" type="primary" @click="useItem(pet)">
                        {{ playerStore.activePet?.id === pet.id ? '召回' : '出战' }}
                      </n-button>
                    </n-space>
                  </template>
                  <div class="pet-trait">{{ traitText(pet.name) }}</div>
                  <p v-if="playerStore.activePet?.id === pet.id">当前出战</p>
                  <template v-else>
                    <strong>出战战力估分 {{ signed(playerStore.petScore(pet)) }}</strong>
                    <p>{{ describeChanges(petChanges(pet)) }}</p>
                  </template>
                  <span v-if="petView === 'surplus'">放生可得 {{ playerStore.petEssenceYield(pet).release }} 精华</span>
                  <n-space vertical>
                    <n-tag :style="{ color: getPetRarityInfo(pet.rarity).color }">
                      {{ getPetRarityInfo(pet.rarity).name }}
                    </n-tag>
                    <n-space justify="space-between">
                      <n-text>等级: <NumericValue :value="pet.level || 1" /></n-text>
                      <n-text>星级: <NumericValue :value="pet.star || 0" /></n-text>
                      <n-button size="small" @click="showPetDetails(pet)">详情</n-button>
                      <n-button size="small" :disabled="pet.id === playerStore.activePet?.id" @click="confirmReleasePet(pet)">放生</n-button>
                    </n-space>
                  </n-space>
                </n-card>
              </n-grid-item>
            </n-grid>
            <n-empty v-else />
          </div>
          </section>
          <section v-else class="forge-page">
            <header class="forge-header">
              <n-radio-group v-model:value="forgeMode" aria-label="装备操作">
                <n-radio-button value="enhance">强化</n-radio-button>
                <n-radio-button value="reforge">洗练</n-radio-button>
              </n-radio-group>
              <div class="forge-wallet">
                <span>强化石 <b>{{ playerStore.reinforceStones }}</b></span>
                <span>洗练石 <b>{{ playerStore.refinementStones }}</b></span>
              </div>
            </header>
            <EquipmentMap mode="forge" :names="equipmentTypes" :equipped="playerStore.equippedArtifacts"
              :selected="forgeItem?.id" @select="slot => forgeId = playerStore.equippedArtifacts[slot]?.id" />
            <div v-if="forgeItem" class="forge-controls">
              <div v-if="forgeMode === 'enhance'" key="enhance" class="forge-actions">
                <n-button secondary type="primary" :disabled="!canBatch" @click="enhanceBatch">一键强化</n-button>
                <n-button type="primary" :disabled="!forgePreview || playerStore.reinforceStones < forgePreview.cost" @click="enhanceOne(forgeItem)">确认强化</n-button>
              </div>
              <div v-else key="reforge" class="forge-actions">
                <label>洗练属性 <select v-model="focusStat" class="focus-select">
                  <option v-for="p in focusOptions" :key="p.stat" :value="p.stat" :disabled="p.after <= p.before">{{ getStatName(p.stat) }}{{ p.after <= p.before ? '（已满）' : '' }}</option>
                </select></label>
                <n-button type="primary" :disabled="!focus || focus.after <= focus.before || playerStore.refinementStones < focusCost" @click="applyFocus">定向洗练 · {{ focusCost }} 石</n-button>
              </div>
              <p v-if="forgeMode === 'reforge' && focusSummary" role="status" class="forge-result">{{ focusSummary }}</p>
              <p v-if="forgeMode === 'enhance' && batchSummary" role="status" class="forge-result">{{ batchSummary }}</p>
              <div class="forge-preview" :aria-label="forgeMode === 'enhance' ? '强化预览' : '洗练预览'">
                <div class="forge-preview-head">
                  <div class="forge-identity">
                    <GearGlyph :slot-type="forgeItem.type" :item-id="forgeItem.id" />
                    <strong>{{ forgeItem.name }}</strong>
                    <b v-if="forgeMode === 'enhance' && forgePreview">+{{ forgeItem.enhanceLevel ?? 0 }} → +{{ forgePreview.nextLevel }}</b>
                  </div>
                  <span v-if="forgeMode === 'reforge'">{{ isWornFocus ? '预计角色战力' : '穿戴后战力增益' }} +{{ focus?.power ?? 0 }}</span>
                  <span v-else-if="forgePreview">成功率 {{ Math.round(forgePreview.successRate * 100) }}% · 成功消耗 {{ forgePreview.cost }} 强化石</span>
                  <span v-else>强化已满级</span>
                </div>
                <dl v-if="forgeMode === 'enhance' && forgePreview" class="forge-stats">
                  <div v-for="(value, stat) in forgePreview.stats" :key="stat">
                    <dt>{{ getStatName(stat) }}</dt>
                    <dd>{{ formatStatValue(stat, forgeItem.stats[stat]) }} → <b>{{ formatStatValue(stat, value) }}</b></dd>
                  </div>
                </dl>
                <div v-else-if="forgeMode === 'reforge'" class="focus-details">
                  <strong v-if="focus">{{ getStatName(focus.stat) }}　{{ formatStatValue(focus.stat, focus.before) }} → {{ formatStatValue(focus.stat, focus.after) }}</strong>
                  <span v-if="focus && focus.after <= focus.before">已达当前有效上限</span>
                  <details><summary>随机重洗</summary>
                    <p>随机调整多条属性，保留原属性也会消耗洗练石。</p>
                    <n-button size="small" :disabled="playerStore.refinementStones < reforgeConfig.costPerAttempt" @click="selectedEquipment = forgeItem; handleReforgeEquipment()">随机重洗 · {{ reforgeConfig.costPerAttempt }} 石</n-button>
                  </details>
                </div>
                <EquipmentComparison v-else :candidate="forgeItem" />
                <n-button v-if="forgeMode === 'enhance' && forgePreview && playerStore.reinforceStones < forgePreview.cost" text @click="openSaleList(true)">去出售闲置装备</n-button>
              </div>
            </div>
            <n-empty v-else description="暂无可操作的装备" />
            <section v-if="reserveRows.length" class="forge-reserve">
              <h3>备用装备</h3>
              <div class="gear-list">
                <article v-for="row in reserveRows" :key="row.item.id" class="gear-row" :class="{ chosen: forgeItem?.id === row.item.id }">
                  <button class="gear-pick" @click="forgeId = row.item.id">
                    <GearGlyph :slot-type="row.item.type" :item-id="row.item.id" />
                    <span><strong>{{ row.item.name }} +{{ row.item.enhanceLevel ?? 0 }}</strong><small>{{ row.worn ? '已穿戴' : '未穿戴' }} · {{ equipmentTypes[row.item.type] }}</small></span>
                  </button>
                  <EquipmentQualityBadge :item="row.item" />
                  <EquipmentComparison :candidate="row.item" />
                  <template v-if="forgeMode === 'enhance'">
                    <small>{{ row.preview ? row.preview.cost + ' 石 · ' + Math.round(row.preview.successRate * 100) + '%' : '已满级' }}</small>
                    <n-button size="small" :disabled="!row.preview || row.preview.cost > playerStore.reinforceStones" @click="enhanceOne(row.item)">强化</n-button>
                  </template>
                  <template v-else>
                    <n-button size="small" @click="forgeId = row.item.id">选择属性</n-button>
                  </template>
                </article>
              </div>
            </section>
          </section>
      </n-card>
    </n-layout-content>
  </n-layout>
  <!-- 灵宠详情弹窗 -->
  <n-modal v-model:show="showCompanions" preset="dialog" title="选择出战灵宠" style="width: min(520px, 94vw)">
    <div style="max-height: 60vh; overflow-y: auto">
      <div v-for="pet in companionChoices" :key="pet.id" class="equipment-slot">
        <div><img class="pet-art" :src="creatureArt(pet.name)" alt="" /><strong>{{ pet.name }} · {{ pet.star ?? 0 }} 星</strong>
          <div>{{ traitText(pet.name) }}</div>
          <div v-if="playerStore.activePet?.id !== pet.id">{{ describeChanges(petChanges(pet), true) }}</div>
        </div>
        <n-button size="small" :disabled="playerStore.activePet?.id === pet.id" @click="chooseCompanion(pet)">
          {{ playerStore.activePet?.id === pet.id ? '当前出战' : '出战' }}
        </n-button>
      </div>
      <n-empty v-if="!companionChoices.length" description="尚未获得灵宠，可前往抽奖的灵宠池" />
    </div>
  </n-modal>
  <n-modal v-model:show="showPetModal" preset="dialog" title="灵宠详情" style="width: min(680px, 94vw); max-height: 88vh; overflow-y: auto">
    <template v-if="selectedPet">
      <n-descriptions bordered>
        <n-descriptions-item label="名称">{{ selectedPet.name }}</n-descriptions-item>
        <n-descriptions-item label="品质">
          <n-tag :style="{ color: getPetRarityInfo(selectedPet.rarity).color }">
            {{ getPetRarityInfo(selectedPet.rarity).name }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="等级"><NumericValue :value="selectedPet.level || 1" /></n-descriptions-item>
        <n-descriptions-item label="星级"><NumericValue :value="selectedPet.star || 0" /></n-descriptions-item>
        <n-descriptions-item label="出战特长">{{ traitText(selectedPet.name) }}</n-descriptions-item>
      </n-descriptions>
      <n-divider>培养</n-divider>
      <n-space vertical>
        <n-space justify="space-between">
          <span>升级（消耗<NumericValue :value="getUpgradeCost(selectedPet)" /> / <NumericValue :value="playerStore.petEssence" />灵宠精华）</span>
          <n-button size="small" type="primary" @click="upgradePet(selectedPet)" :disabled="!canUpgrade(selectedPet)">
            升级
          </n-button>
        </n-space>
        <div class="pet-training-row">
          <strong>升星 · {{ selectedPet.starProgress ?? 0 }} / {{ nextStarCost(selectedPet.star) }}</strong>
          <span>同品质 +1，同名 +2。每升一星，自身属性提高 10%。</span>
          <n-space>
            <n-select v-model:value="selectedFoodPet" :options="getAvailableFoodPets(selectedPet)"
              placeholder="选择要消耗的同品质灵宠" style="width: 255px" />
            <n-button type="warning" :disabled="!foodPreview" @click="evolvePet(selectedPet)">消耗材料</n-button>
          </n-space>
          <span v-if="foodPreview">消耗 {{ foodPreview.food.name }} 后为 {{ foodPreview.star }} 星（{{ foodPreview.progress }} / {{ nextStarCost(foodPreview.star) }}）<template v-if="foodPreview.refund">，返还 {{ foodPreview.refund }} 精华</template></span>
        </div>
        <div class="pet-training-row" v-if="trainingSources.length">
          <strong>继承等级</strong>
          <n-space>
            <n-select v-model:value="trainingSource" :options="trainingSources" placeholder="选择传出等级的灵宠" style="width: 255px" />
            <n-button :disabled="!inheritPreview" @click="inheritTraining">继承</n-button>
          </n-space>
          <span v-if="inheritPreview">{{ inheritPreview.source.name }} 回到 1 级，{{ selectedPet.name }} 达到 {{ inheritPreview.level }} 级<template v-if="inheritPreview.remainder">，余下 {{ inheritPreview.remainder }} 精华返入背包</template>。双方保留星级。</span>
        </div>
        <n-space justify="space-between">
          <span>放生可得 {{ playerStore.petEssenceYield(selectedPet).release }} 精华，已用于升级的精华不返还。</span>
          <n-button size="small" type="error" :disabled="selectedPet.id === playerStore.activePet?.id" @click="confirmReleasePet(selectedPet)">放生灵宠</n-button>

        </n-space>
      </n-space>
      <details v-if="playerStore.activePet?.id !== selectedPet.id">
        <summary>出战属性变化 · 战力估分 {{ signed(playerStore.petScore(selectedPet)) }}</summary>
        <p>{{ describeChanges(petChanges(selectedPet), true) }}</p>
      </details>
      <n-divider>灵宠属性</n-divider>
      <n-collapse>
        <n-collapse-item title="展开" name="1">
          <n-divider>基础属性</n-divider>
          <n-descriptions bordered :column="2">
            <n-descriptions-item label="攻击力">{{ selectedPet.combatAttributes?.attack || 0 }}</n-descriptions-item>
            <n-descriptions-item label="生命值">{{ selectedPet.combatAttributes?.health || 0 }}</n-descriptions-item>
            <n-descriptions-item label="防御力">{{ selectedPet.combatAttributes?.defense || 0 }}</n-descriptions-item>
            <n-descriptions-item label="速度">{{ selectedPet.combatAttributes?.speed || 0 }}</n-descriptions-item>
          </n-descriptions>
          <n-divider>战斗属性</n-divider>
          <n-descriptions bordered :column="3">
            <n-descriptions-item label="暴击率">
              <NumericValue :value="((selectedPet.combatAttributes?.critRate || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="连击率">
              <NumericValue :value="((selectedPet.combatAttributes?.comboRate || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="反击率">
              <NumericValue :value="((selectedPet.combatAttributes?.counterRate || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="眩晕率">
              <NumericValue :value="((selectedPet.combatAttributes?.stunRate || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="闪避率">
              <NumericValue :value="((selectedPet.combatAttributes?.dodgeRate || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="吸血率">
              <NumericValue :value="((selectedPet.combatAttributes?.vampireRate || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
          </n-descriptions>
          <n-divider>战斗抗性</n-divider>
          <n-descriptions bordered :column="3">
            <n-descriptions-item label="抗暴击">
              <NumericValue :value="((selectedPet.combatAttributes?.critResist || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="抗连击">
              <NumericValue :value="((selectedPet.combatAttributes?.comboResist || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="抗反击">
              <NumericValue :value="((selectedPet.combatAttributes?.counterResist || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="抗眩晕">
              <NumericValue :value="((selectedPet.combatAttributes?.stunResist || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="抗闪避">
              <NumericValue :value="((selectedPet.combatAttributes?.dodgeResist || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="抗吸血">
              <NumericValue :value="((selectedPet.combatAttributes?.vampireResist || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
          </n-descriptions>
          <n-divider>特殊属性</n-divider>
          <n-descriptions bordered :column="3">
            <n-descriptions-item label="强化治疗">
              <NumericValue :value="((selectedPet.combatAttributes?.healBoost || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="强化爆伤">
              <NumericValue :value="((selectedPet.combatAttributes?.critDamageBoost || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="弱化爆伤">
              <NumericValue :value="((selectedPet.combatAttributes?.critDamageReduce || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="最终增伤">
              <NumericValue :value="((selectedPet.combatAttributes?.finalDamageBoost || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="最终减伤">
              <NumericValue :value="((selectedPet.combatAttributes?.finalDamageReduce || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="战斗属性提升">
              <NumericValue :value="((selectedPet.combatAttributes?.combatBoost || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
            <n-descriptions-item label="战斗抗性提升">
              <NumericValue :value="((selectedPet.combatAttributes?.resistanceBoost || 0) * 100).toFixed(1)" />%
            </n-descriptions-item>
          </n-descriptions>
        </n-collapse-item>
      </n-collapse>
    </template>
  </n-modal>
  <n-modal v-model:show="showReleaseConfirm" preset="dialog" title="灵宠放生" style="width: 600px">
    <template v-if="petToRelease">
      <p>放生 {{ petToRelease.name }} 可得 {{ playerStore.petEssenceYield(petToRelease).release }} 精华，放生后无法找回。{{ roster.surplus.has(petToRelease.id) ? '' : '这只属于默认保留的灵宠。' }}</p>
      <n-space justify="end" style="margin-top: 16px">
        <n-button size="small" @click="cancelReleasePet">取消</n-button>
        <n-button size="small" type="error" @click="releasePet">确认放生</n-button>
      </n-space>
    </template>
  </n-modal>
  <!-- 装备列表弹窗 -->
  <n-modal
    v-model:show="showEquipmentModal"
    preset="dialog"
    :title="selectedEquipmentType ? equipmentTypes[selectedEquipmentType] + '列表' : '出售闲置装备'"
    style="width: min(800px, 94vw); max-height: 88vh; overflow-y: auto"
  >
    <n-space vertical>
      <div v-if="selectedEquipmentType" class="current-worn">
        <span>当前穿戴 <strong>{{ wornItem?.name ?? '空位' }}<template v-if="wornItem?.enhanceLevel"> +{{ wornItem.enhanceLevel }}</template></strong></span>
        <n-button v-if="wornItem" text @click="unequipItem(selectedEquipmentType)">卸下</n-button>
        <dl v-if="wornItem" aria-label="本件装备属性" class="worn-stats">
          <div v-for="(value, stat) in wornItem.stats" :key="stat"><dt>{{ getStatName(stat) }}</dt><dd>{{ value > 0 ? '+' : '' }}{{ formatStatValue(stat, value) }}</dd></div>
        </dl>
      </div>
      <n-space justify="space-between">
        <select v-if="selectedEquipmentType" v-model="equipmentOrder" class="gear-sort" aria-label="装备排序">
          <option value="combat">按战力提升</option>
          <option value="training">按修炼收益</option>
        </select>
        <n-select v-model:value="selectedQuality" :options="qualityOptions" style="width: 150px" />
        <n-button v-if="!selectedEquipmentType" type="warning" :disabled="equipmentList.length === 0" @click="batchSellEquipments">一键卖出</n-button>
      </n-space>
      <n-pagination
        v-model:page="currentEquipmentPage"
        :page-size="equipmentPageSize"
        :item-count="filteredEquipmentList.length"
        v-if="filteredEquipmentList.length > equipmentPageSize"
        @update:page-size="onEquipmentPageSizeChange"
        :page-slot="7"
      />
      <n-grid cols="1 600:2" :x-gap="12" :y-gap="8" v-if="equipmentList.length">
        <n-grid-item v-for="equipment in equipmentList" :key="equipment.id">
          <n-card hoverable>
            <template #header>
              <n-space justify="space-between">
                <n-button text @click="showEquipmentDetails(equipment)">{{ equipment.name }}</n-button>
              </n-space>
            </template>
            <n-space vertical>
              <EquipmentQualityBadge :item="equipment" />
              <span>{{ equipmentLabel(equipment) }}</span>
              <EquipmentComparison :candidate="equipment" :current="playerStore.equippedArtifacts[equipment.type]" />
              <n-button size="small" :type="guideWeapon && equipment.id === starterSwordId ? 'primary' : 'default'" :disabled="playerStore.level < (equipment.requiredRealm ?? 1)" @click="equipItem(equipment)">
                {{ playerStore.level < (equipment.requiredRealm ?? 1) ? getRealmName(equipment.requiredRealm ?? 1).name + '可穿' : '穿戴' }}
              </n-button>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>
      <n-empty :description="selectedEquipmentType ? '当前筛选下没有可替换的装备' : '没有任何装备'" v-else></n-empty>
    </n-space>
  </n-modal>
  <!-- 装备详情弹窗 -->
  <n-modal v-model:show="showEquipmentDetailModal" preset="dialog" :title="selectedEquipment?.name || '装备详情'">
    <n-descriptions bordered>
      <n-descriptions-item label="品质与评分">
        <details v-if="selectedEquipment" :key="selectedEquipment.id" class="quality-guide">
          <summary><EquipmentQualityBadge :item="selectedEquipment" /></summary>
          <ol aria-label="装备品质从低到高">
            <li v-for="(quality, key) in equipmentQualities" :key="key" :aria-current="key === selectedEquipment.quality ? 'true' : undefined">
              {{ quality.name }}<strong v-if="key === selectedEquipment.quality"> · 当前</strong>
            </li>
          </ol>
          <details><summary>同等级基础属性倍率</summary>
            <ul><li v-for="quality in equipmentQualities" :key="quality.name">{{ quality.name }} ×{{ quality.statMod }}</li></ul>
          </details>
        </details>
      </n-descriptions-item>
      <n-descriptions-item label="类型">
        {{ equipmentTypes[selectedEquipment?.type ?? 'weapon'] }}
      </n-descriptions-item>
      <n-descriptions-item label="强化等级">+{{ selectedEquipment?.enhanceLevel || 0 }}</n-descriptions-item>
      <template v-if="selectedEquipment?.stats && !equipmentComparison">
        <n-descriptions-item v-for="(value, stat) in selectedEquipment.stats" :key="stat" :label="getStatName(stat)">
          <NumericValue :value="formatStatValue(stat, value)" />
        </n-descriptions-item>
      </template>
    </n-descriptions>
    <div
      class="stats-comparison"
      v-if="equipmentComparison && selectedEquipment && selectedEquipment.id != playerStore.equippedArtifacts[selectedEquipment.slot ?? selectedEquipment.type]?.id"
    >
      <n-divider>属性对比</n-divider>
      <n-table :bordered="false" :single-line="false">
        <thead>
          <tr>
            <th>属性</th>
            <th>当前装备</th>
            <th>选中装备</th>
            <th>属性变化</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(comparison, stat) in equipmentComparison" :key="stat">
            <td>{{ getStatName(stat) }}</td>
            <td><NumericValue :value="formatStatValue(stat, comparison.current)" /></td>
            <td><NumericValue :value="formatStatValue(stat, comparison.selected)" /></td>
            <td>
              <n-gradient-text :type="comparison.diff === 0 ? 'info' : comparison.isPositive ? 'success' : 'error'">
                {{ comparison.isPositive ? '+' : '' }}<NumericValue :value="formatStatValue(stat, comparison.diff)" />
              </n-gradient-text>
            </td>
          </tr>
        </tbody>
      </n-table>
    </div>
    <template #action>
        <n-space>
          <n-button
            @click="selectedEquipment && equipItem(selectedEquipment)"
            :disabled="playerStore.level < (selectedEquipment?.requiredRealm ?? 1)"
            v-if="selectedEquipment && selectedEquipment.id != playerStore.equippedArtifacts[selectedEquipment.slot ?? selectedEquipment.type]?.id"
          >
            装备
          </n-button>
          <n-button
            @click="selectedEquipment && unequipItem(selectedEquipment.type)"
            v-else
          >
            卸下
          </n-button>
          <n-button
            type="error"
            @click="selectedEquipment && sellEquipment(selectedEquipment)"
            v-if="selectedEquipment && selectedEquipment.id != playerStore.equippedArtifacts[selectedEquipment.slot ?? selectedEquipment.type]?.id"
          >
            出售
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
            {{ getStatName(key) }}: <NumericValue :value="formatStatValue(key, value)" />
          </div>
        </div>
        <div class="new-stats">
          <h3>新属性</h3>
          <div v-for="(value, key) in reforgeResult.newStats" :key="key">
            {{ getStatName(key) }}: <NumericValue :value="formatStatValue(key, value)" />
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

<script setup lang="ts">
  import AutoLootSettings from '../components/AutoLootSettings.vue'
  import { investedEssence, nextStarCost, starResult, starValue, traitText, transferPlan, upgradeCost as getUpgradeCost } from '../plugins/pet-growth'
  import { isPet, battlePoints, projectedChanges, type ReleaseQuote } from '../plugins/companion-ranking'
  import { useRoute } from 'vue-router'
  import { starterDestination, starterSwordId } from '../plugins/navigation'
  import { highestFloorKey } from '../plugins/battle-report'
  import EquipmentComparison from '../components/EquipmentComparison.vue'
  import { useGameNotices } from '../plugins/game-notices'
  import { applyEquipmentChanges, equipmentDifferences } from '../plugins/equipment-stats'
  import EquipmentQualityBadge from '../components/EquipmentQualityBadge.vue'
  import { equipmentQualities } from '../plugins/equipment-quality'
  import { creatureArt } from '../plugins/illustrations'
  import GearGlyph from '../components/GearGlyph.vue'
  import EquipmentMap from '../components/EquipmentMap.vue'
  import { PawOutline } from '@vicons/ionicons5'
  import NumericValue from '../components/NumericValue.vue'

  import { usePlayerStore } from '../stores/player'
  import type { Equipment, EquipmentQuality, EquipmentSlot, GameItem, ItemId, Pet, PetRarity, Stats } from '../types/game'
  import { ref, computed, watch } from 'vue'
  import { useDialog, useMessage } from 'naive-ui'
  import { getStatName, formatStatValue } from '../plugins/stats'
  import { getRealmName } from '../plugins/realm'
  import type { PillGrade, PillRecipe, PillType } from '../plugins/pills'
  import { enhancementPreview, enhanceEquipment, focusCost, focusPreview, reforgeEquipment, reforgeConfig } from '../plugins/equipment'
  import type { EquipmentChangeResult } from '../plugins/equipment'

  // 分页相关
  const currentPage = ref(1)
  const pageSize = ref(12)

  // 过滤后的灵宠列表
  const petView = ref<'recommended' | 'evolve' | 'surplus'>('recommended')
  const roster = computed(() => playerStore.classifyPets())
  const petChanges = (pet: Pet) => projectedChanges(playerStore, playerStore.effectBonuses, pet.combatAttributes, playerStore.activePet?.combatAttributes)
  const signed = (n: number) => (n > 0 ? '+' : '') + n
  const describeChanges = (changes: Stats, all = false) => {
    const entries = Object.entries(changes)
    const up = entries.filter(([, n]) => n > 0)
    const down = entries.filter(([, n]) => n < 0)
    const shown = all ? entries : [...up.slice(0, down.length ? 2 : 3), ...down.slice(0, up.length ? 1 : 3)]
    return shown.map(([key, n]) => getStatName(key) + ' ' + (n > 0 ? '+' : '') + formatStatValue(key, n)).join('、') || '属性无变化'
  }
  const filteredPets = computed(() => {
    const active = playerStore.activePet?.id
    return playerStore.items.filter(isPet).filter(p =>
      (selectedRarityToRelease.value === 'all' || selectedRarityToRelease.value === p.rarity) &&
      (petView.value === 'recommended' || (petView.value === 'evolve' ? roster.value.evolvable : roster.value.surplus).has(p.id)))
      .map(p => ({ p, score: playerStore.petScore(p) }))
      .sort((a, b) => Number(b.p.id === active) - Number(a.p.id === active) || b.score - a.score).map(row => row.p)
  })
  // 当前页显示的灵宠
  const displayPets = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredPets.value.slice(start, end)
  })

  // 页大小改变处理
  const onPageSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
  }

  const playerStore = usePlayerStore()
  const showAllStats = ref(false)
  const showZeroStats = ref(false)
  const visibleStatGroups = computed(() => [
    { label: '战斗属性', values: playerStore.effectiveCombatAttributes },
    { label: '战斗抗性', values: playerStore.effectiveCombatResistance },
    { label: '特殊属性', values: playerStore.effectiveSpecialAttributes }
  ].map(group => ({
    label: group.label,
    entries: Object.entries(group.values).filter(([, value]) => showZeroStats.value || value !== 0)
  })).filter(group => group.entries.length))
  const showCompanions = ref(false)
  const companionChoices = computed(() => playerStore.items.filter(isPet).map(pet => ({
    pet, active: pet.id === playerStore.activePet?.id, score: playerStore.petScore(pet)
  })).sort((a, b) => Number(b.active) - Number(a.active) || b.score - a.score).map(row => row.pet))
  const chooseCompanion = (pet: Pet) => {
    const result = playerStore.usePet(pet)
    if (result.success) {
      showCompanions.value = false
      message.success(result.message)
    } else message.error(result.message)
  }
  const props = withDefaults(defineProps<{ section: 'character' | 'bag' | 'forge'; kind?: string }>(), { kind: 'loose' })
  const pageTitle = computed(() => {
    if (props.section === 'character') return '角色'
    if (props.section === 'forge') return '强化'
    return props.kind === 'pets' ? '灵宠' : '装备'
  })
  const route = useRoute()
  const bagPage = ref(1)
  const equipmentOrder = ref<'combat' | 'training'>('combat')
  const gearChanges = (item: Equipment) => projectedChanges(playerStore, playerStore.effectBonuses, item.stats, playerStore.equippedArtifacts[item.type]?.stats)
  function gearScore(item: Equipment) {
    const delta = gearChanges(item)
    if (equipmentOrder.value === 'combat') return battlePoints(delta)
    const { spiritRate, cultivationRate } = playerStore.artifactBonuses
    return 100 * ((spiritRate + (delta.spiritRate ?? 0)) * (cultivationRate + (delta.cultivationRate ?? 0)) / (spiritRate * cultivationRate) - 1)
  }
  const equipmentLabel = (item: Equipment) => (equipmentOrder.value === 'combat' ? '换装战力 ' : '修炼收益 ') +
    signed(Number(gearScore(item).toFixed(1))) + (equipmentOrder.value === 'training' ? '%' : '')
  const rankEquipment = (list: Equipment[]) => list.map(item => ({
    item, score: gearScore(item), locked: (item.requiredRealm ?? 1) > playerStore.level
  })).sort((a, b) => Number(a.locked) - Number(b.locked) || b.score - a.score).map(row => row.item)
  const looseEquipment = computed(() => rankEquipment(playerStore.items.filter((item): item is Equipment => item.type !== 'pill' && item.type !== 'pet')))
  watch(equipmentOrder, () => { bagPage.value = 1; currentEquipmentPage.value = 1 })
  watch(() => looseEquipment.value.length, count => {
    bagPage.value = Math.min(bagPage.value, Math.max(1, Math.ceil(count / 8)))
  })
  const forgeId = ref<ItemId>()
  const forgeMode = ref<'enhance' | 'reforge'>('enhance')
  const forgeItems = computed(() => [
    ...Object.values(playerStore.equippedArtifacts).filter((item): item is Equipment => !!item),
    ...looseEquipment.value
  ])
  watch(() => [props.section, route.query.item, route.query.mode], () => {
    if (props.section !== 'forge' || typeof route.query.item !== 'string') return
    forgeId.value = forgeItems.value.find(item => String(item.id) === route.query.item)?.id
    forgeMode.value = route.query.mode === 'reforge' ? 'reforge' : 'enhance'
  }, { immediate: true })
  const forgeItem = computed(() => forgeItems.value.find(item => item.id === forgeId.value) ?? forgeItems.value[0])
  const forgeRows = computed(() => forgeItems.value.map(item => ({
    item, worn: playerStore.equippedArtifacts[item.type]?.id === item.id, preview: enhancementPreview(item)
  })))
  const canBatch = computed(() => forgeRows.value.some(row => row.preview && row.preview.cost <= playerStore.reinforceStones))
  const batchSummary = ref('')
  const reserveRows = computed(() => forgeRows.value.filter(row => !row.worn))
  const enhanceBatch = () => {
    const before = playerStore.reinforceStones
    let success = 0, failed = 0, skipped = 0
    for (const { item, preview } of forgeRows.value) {
      if (!preview) continue
      if (preview.cost > playerStore.reinforceStones) {
        skipped++
        continue
      }
      if (applyEnhancement(item).success) success++
      else failed++
    }
    if (success) void playerStore.saveData()
    batchSummary.value = `成功 ${success} 件 · 失败 ${failed} 件 · 跳过 ${skipped} 件 · 消耗 ${before - playerStore.reinforceStones} 强化石`
  }
  const forgePreview = computed(() => forgeItem.value && enhancementPreview(forgeItem.value))
  const focusOptions = computed(() => {
    const item = forgeItem.value
    return item ? Object.keys(item.stats).flatMap(stat => focusPreview(playerStore, item, stat) ?? []) : []
  })
  const chosenFocus = ref('')
  const focusSummary = ref('')
  watch(() => forgeItem.value?.id, () => { chosenFocus.value = ''; focusSummary.value = '' })
  watch(forgeMode, () => { focusSummary.value = '' })
  const focusStat = computed({
    get: () => focusOptions.value.find(p => p.stat === chosenFocus.value)?.stat ??
      focusOptions.value.find(p => p.after > p.before)?.stat ?? focusOptions.value[0]?.stat ?? '',
    set: (stat: string) => { chosenFocus.value = stat }
  })
  const focus = computed(() => focusOptions.value.find(p => p.stat === focusStat.value))
  const isWornFocus = computed(() => forgeItem.value && playerStore.equippedArtifacts[forgeItem.value.type]?.id === forgeItem.value.id)
  const applyFocus = () => {
    if (!forgeItem.value || !focus.value) return
    const { stat, before, after } = focus.value
    const powerBefore = playerStore.combatPower
    const result = playerStore.focusEquipment(forgeItem.value, stat)
    if (!result.success) { message.error(result.message); return }
    const gained = Number((playerStore.combatPower - powerBefore).toFixed(2))
    focusSummary.value = forgeItem.value.name + ' · ' + getStatName(stat) + ' ' + formatStatValue(stat, before) +
      ' → ' + formatStatValue(stat, after) + (gained ? ' · 战力 +' + gained : '')
  }
  const retryReport = computed(() => {
    const latest = playerStore.dungeonReports.find(report => report.difficulty === playerStore.dungeonDifficulty)
    return latest && !latest.won && latest.floor === playerStore[highestFloorKey(latest.difficulty)] + 1 ? latest : null
  })
  const message = useMessage()
  const notify = useGameNotices()


  // 灵宠品质配置
  const petRarities: Record<PetRarity, { name: string; color: string; probability: number; essenceBonus: number }> = {
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
  const getPetRarityInfo = (rarity: string) => petRarities[rarity as PetRarity] ?? petRarities.mortal
  // 灵宠详情相关
  const showPetModal = ref(false)
  const selectedPet = ref<Pet | null>(null)
  const selectedFoodPet = ref<ItemId | null>(null)
  const trainingSource = ref<ItemId | null>(null)
  const trainingSources = computed(() => playerStore.items.filter(isPet)
    .filter(p => p.id !== selectedPet.value?.id && p.level > 1)
    .map(p => ({ value: p.id, label: p.name + ' · ' + p.level + '级 · ' + p.star + '星' })))
  const inheritPreview = computed(() => {
    const source = trainingSource.value == null ? undefined : playerStore.ownedPet(trainingSource.value)
    return source && selectedPet.value ? { source, ...transferPlan(source, selectedPet.value) } : null
  })
  const foodPreview = computed(() => {
    const food = selectedFoodPet.value == null ? undefined : playerStore.ownedPet(selectedFoodPet.value)
    return food && selectedPet.value ? { food, refund: investedEssence(food.level), ...starResult(selectedPet.value, food) } : null
  })
  const inheritTraining = () => {
    if (trainingSource.value == null || !selectedPet.value) return
    const res = playerStore.transferPetTraining(trainingSource.value, selectedPet.value.id)
    message[res.success ? 'success' : 'error'](res.message)
    trainingSource.value = null
  }

  // 放生确认弹窗
  const showReleaseConfirm = ref(false)
  const showBatchReleaseConfirm = ref(false)
  const petToRelease = ref<Pet | null>(null)

  // 显示放生确认弹窗
  const confirmReleasePet = (pet: Pet) => {
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
    if (!petToRelease.value) return
    const res = playerStore.releasePets(playerStore.quotePetRelease([petToRelease.value]), false)
    if (res.success) {
      notify('放生灵宠', petToRelease.value.name)
      notify('放生所得', '灵宠精华 +' + playerStore.petEssenceYield(petToRelease.value).release)
      showPetModal.value = false
    }
    else message.error(res.message)
    cancelReleasePet()
  }
  const selectedRarityToRelease = ref<PetRarity | 'all'>('all')
  watch([petView, selectedRarityToRelease], () => { currentPage.value = 1 })
  watch(() => filteredPets.value.length, n => { currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(n / pageSize.value))) })
  const batchQuote = ref<ReleaseQuote>({ ids: [], essence: 0 })
  const openBatchRelease = () => {
    batchQuote.value = playerStore.quotePetRelease(filteredPets.value.filter(p => roster.value.surplus.has(p.id)))
    showBatchReleaseConfirm.value = true
  }
  const batchReleasePets = () => {
    const pets = batchQuote.value.ids.map(id => playerStore.ownedPet(id))
    const res = playerStore.releasePets(batchQuote.value)
    if (res.success) {
      for (const pet of pets) if (pet) notify('放生灵宠', pet.name)
      notify('放生所得', '灵宠精华 +' + batchQuote.value.essence)
    }
    else message.error(res.message)
    showBatchReleaseConfirm.value = false
  }

  // 显示灵宠详情
  const showPetDetails = (pet: Pet) => {
    selectedPet.value = pet
    trainingSource.value = null
    selectedFoodPet.value = null
    showPetModal.value = true
  }

  // 检查是否可以升级
  const canUpgrade = (pet: Pet) => {
    const cost = getUpgradeCost(pet)
    return playerStore.petEssence >= cost
  }

  // 获取可用作升星材料的灵宠列表
  const getAvailableFoodPets = (pet: Pet | null) => {
    if (!pet) return []
    return playerStore.items
      .filter(
        (item): item is Pet =>
          item.type === 'pet' &&
          item.id !== pet.id &&
          item.id !== playerStore.activePet?.id && item.rarity === pet.rarity
      )
      .map(item => ({
        label: `${item.name} · ${item.level}级 ${item.star}星 · +${starValue(pet, item)}进度`,
        value: item.id
      }))
  }

  // 升级灵宠
  const upgradePet = (pet: Pet) => {
    const result = playerStore.upgradePet(pet)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 升星灵宠
  const evolvePet = (pet: Pet) => {
    if (selectedFoodPet.value == null) {
      message.error('请选择用于升星的灵宠')
      return
    }
    // 通过id查找对应的灵宠对象
    const foodPet = playerStore.items.find((item): item is Pet => item.type === 'pet' && item.id === selectedFoodPet.value)
    if (!foodPet) {
      message.error('升星材料灵宠不存在')
      return
    }
    const result = playerStore.evolvePet(pet, foodPet)
    if (result.success) {
      message.success(result.message)
      selectedFoodPet.value = null
    } else {
      message.error(result.message)
    }
  }

  // 装备类型配置
  import { equipmentNames as equipmentTypes } from '../types/game'

  // 当前选中的装备类型
  const selectedType = ref<EquipmentSlot | ''>('')

  // 显示装备类型弹窗
  const guideWeapon = computed(() => starterDestination(playerStore) === '/character')
  const unreadSlots = computed(() => new Set(playerStore.items.flatMap(item =>
    item.type !== 'pill' && item.type !== 'pet' && item.unread ? [item.type] : [])))
  const showEquipmentList = (type: EquipmentSlot) => {
    if (unreadSlots.value.has(type) || (guideWeapon.value && type === 'weapon')) {
      selectedQuality.value = 'all'
      currentEquipmentPage.value = 1
    }
    if (unreadSlots.value.has(type)) {
      for (const item of playerStore.items) if (item.type === type) delete item.unread
      playerStore.saveData()
    }
    selectedType.value = type
    selectedEquipmentType.value = type
    showEquipmentModal.value = true
  }

  // 卸下装备
  const unequipItem = (slot: EquipmentSlot) => {
    const result = playerStore.unequipArtifact(slot)
    if (result) {
      showEquipmentDetailModal.value = false
      message.success('当前装备已卸下')
    } else {
      message.error('卸下装备失败')
    }
  }

  // 装备列表相关
  const showEquipmentModal = ref(false)
  const selectedEquipmentType = ref<EquipmentSlot | ''>('')
  const wornItem = computed(() => selectedEquipmentType.value ? playerStore.equippedArtifacts[selectedEquipmentType.value] : null)
  const enhanceTargetId = ref<Equipment['id'] | undefined>()
  const openSaleList = (fromForge: boolean) => {
    enhanceTargetId.value = fromForge ? forgeItem.value?.id : undefined
    showEquipmentDetailModal.value = false
    selectedEquipmentType.value = ''
    const loose = playerStore.items.filter((item): item is Equipment => item.type !== 'pill' && item.type !== 'pet' && item.id !== enhanceTargetId.value)
    selectedQuality.value = loose.some(item => item.quality === 'common') ? 'common' : 'all'
    currentEquipmentPage.value = 1
    showEquipmentModal.value = true
  }
  const selectedQuality = ref<EquipmentQuality | 'all'>('all')
  const currentEquipmentPage = ref(1)
  const equipmentPageSize = ref(8)
  watch([selectedQuality, selectedEquipmentType], () => { currentEquipmentPage.value = 1 })

  // 装备品质选项
  const qualityOptions = computed(() => {
    const equipmentsByQuality: Partial<Record<EquipmentQuality, number>> = {}
    playerStore.items
      .filter((item): item is Equipment => item.type !== 'pet' && item.type !== 'pill')
      .filter(item => !selectedEquipmentType.value || item.type === selectedEquipmentType.value)
      .forEach(item => {
        equipmentsByQuality[item.quality as EquipmentQuality] = (equipmentsByQuality[item.quality as EquipmentQuality] || 0) + 1
      })
    return [
      { label: '全部品质', value: 'all' },
      ...Object.entries(equipmentQualities).reverse().map(([key, info]) => ({
        label: info.name,
        value: key,
        disabled: !equipmentsByQuality[key as EquipmentQuality]
      }))
    ]
  })

  // 过滤后的装备列表
  const filteredEquipmentList = computed(() => {
    const list = playerStore.items.filter((item): item is Equipment => item.type !== 'pet' && item.type !== 'pill').filter(item => {
      if (!selectedEquipmentType.value && item.id === enhanceTargetId.value) return false
      if (selectedEquipmentType.value && item.type !== selectedEquipmentType.value) return false
      if (selectedQuality.value !== 'all' && item.quality !== selectedQuality.value) return false
      return true
    })
    return rankEquipment(list)
  })

  // 当前页显示的装备
  watch(() => filteredEquipmentList.value.length, count => {
    const lastPage = Math.max(1, Math.ceil(count / equipmentPageSize.value))
    currentEquipmentPage.value = Math.min(currentEquipmentPage.value, lastPage)
  })

  const equipmentList = computed(() => {
    const start = (currentEquipmentPage.value - 1) * equipmentPageSize.value
    const end = start + equipmentPageSize.value
    return filteredEquipmentList.value.slice(start, end)
  })

  // 装备页大小改变处理
  const onEquipmentPageSizeChange = (size: number) => {
    equipmentPageSize.value = size
    currentEquipmentPage.value = 1
  }

  // 批量卖出装备
  const dialog = useDialog()
  const batchSellEquipments = () => {
    const quote = playerStore.quoteEquipmentSale(filteredEquipmentList.value)
    const enhanced = quote.enhanced ? `其中 ${quote.enhanced} 件已强化。` : ''
    dialog.warning({
      title: '确认批量卖出',
      content: `将卖出筛选范围内共 ${quote.ids.length} 件装备，可获得 ${quote.total} 个强化石。${enhanced}`,
      negativeText: '取消',
      positiveText: '确认卖出',
      onPositiveClick: () => {
        const sold = filteredEquipmentList.value.filter(item => quote.ids.includes(item.id))
        const result = playerStore.confirmEquipmentSale(quote)
        if (result.success) {
          for (const item of sold) notify('出售装备', item.name)
          notify('出售所得', '强化石 +' + quote.total)
        }
        else message.error(result.message)
      }
    })
  }

  // 卖出单件装备
  const sellEquipment = async (equipment: Equipment) => {
    const quote = playerStore.quoteEquipmentSale([equipment])
    const result = await playerStore.sellEquipment(equipment)
    if (result.success) {
      notify('出售装备', equipment.name)
      notify('出售所得', '强化石 +' + quote.total)
      showEquipmentDetailModal.value = false
    } else {
      message.error(result.message || '卖出失败')
    }
  }

  // 显示装备详情
  const showEquipmentDetails = (equipment: Equipment | null) => {
    selectedEquipment.value = equipment
    showEquipmentDetailModal.value = true
  }

  // 装备详情相关
  const showEquipmentDetailModal = ref(false)
  const selectedEquipment = ref<Equipment | null>(null)

  // 强化装备
  const applyEnhancement = (item: Equipment) => {
    const result = enhanceEquipment(item, playerStore.reinforceStones)
    if (result.success && result.cost != null && result.newStats) {
      playerStore.reinforceStones -= result.cost
      if (playerStore.equippedArtifacts[item.type]?.id === item.id) {
        applyEquipmentChanges(playerStore, equipmentDifferences(result.newStats, result.oldStats ?? {}))
      }
    }
    return result
  }
  const enhanceOne = (item: Equipment) => {
    forgeId.value = item.id
    const result = applyEnhancement(item)
    if (result.success) {
      message.success(`${item.name} 已强化至 +${result.newLevel}`)
      playerStore.saveData()
    } else message.info(result.message)
  }

  // 洗练确认弹窗
  const showReforgeConfirm = ref(false)
  const reforgeResult = ref<EquipmentChangeResult | null>(null)

  // 洗练装备
  const handleReforgeEquipment = () => {
    if (!selectedEquipment.value) return
    const result = reforgeEquipment(selectedEquipment.value, playerStore.refinementStones, false)
    if (result.success && result.cost != null) {
      playerStore.refinementStones -= result.cost
      reforgeResult.value = result
      showReforgeConfirm.value = true
    } else {
      message.error(result.message || '洗练失败')
    }
  }

  // 确认洗练结果
  const confirmReforgeResult = (confirm: boolean) => {
    if (!reforgeResult.value) return
    if (confirm) {
      // 用户确认后，应用新属性
      if (!selectedEquipment.value) return
      const newStats = reforgeResult.value.newStats ?? {}
      if (playerStore.equippedArtifacts[selectedEquipment.value.type]?.id === selectedEquipment.value.id) {
        applyEquipmentChanges(playerStore, equipmentDifferences(newStats, selectedEquipment.value.stats))
      }
      selectedEquipment.value.stats = newStats
      message.success('已确认新属性')
    } else {
      // 用户取消，保留原属性
      message.info('已保留原有属性')
    }
    showReforgeConfirm.value = false
    reforgeResult.value = null
    playerStore.saveData()
  }

  const equipSummary = ref('')
  const summaryDetails = ref('')
  const previewBestQuality = () => {
    const changes: Record<string, number> = {}
    for (const item of playerStore.bestQualityCandidates()) {
      const current = playerStore.equippedArtifacts[item.type]
      for (const [stat, delta] of Object.entries(equipmentDifferences(item.stats, current?.stats ?? {}))) {
        changes[stat] = (changes[stat] ?? 0) + delta
      }
    }
    const entries = Object.entries(changes).filter(([, delta]) => Math.abs(delta) > 1e-9)
    if (entries.some(([, delta]) => delta < 0)) {
      dialog.warning({
        title: '换装后的属性变化',
        content: entries.map(([stat, delta]) => getStatName(stat) + (delta > 0 ? ' +' : ' ') + formatStatValue(stat, delta)).join('、'),
        positiveText: '确认换装', negativeText: '保留当前装备', onPositiveClick: equipBestQuality
      })
    } else equipBestQuality()
  }
  const equipBestQuality = () => {
    const before = { ...playerStore.artifactBonuses }
    const changed = playerStore.equipBestQuality()
    if (!changed) {
      message.info('暂无可穿戴的更高品质装备')
      return
    }
    const changes = Object.entries(playerStore.artifactBonuses).flatMap(([stat, value]) => {
      const diff = value - before[stat]
      if (Math.abs(diff) < 1e-9) return []
      return [`${getStatName(stat)} ${diff > 0 ? '+' : ''}${formatStatValue(stat, diff)}`]
    })
    equipSummary.value = `已更换 ${changed} 个部位 · ${changes.slice(0, 3).join('、') || '属性无变化'}`
    summaryDetails.value = changes.slice(3).join('、')
  }

  // 使用装备
  const equipItem = (equipment: Equipment) => {
    const result = playerStore.equipArtifact(equipment, equipment.type)
    if (result.success) {
      message.success(result.message)
      showEquipmentModal.value = false
      showEquipmentDetailModal.value = false
    } else {
      message.error(result.message || '装备失败')
    }
  }

  // 使用物品
  const useItem = (item: GameItem) => {
    if (item.type === 'pet') {
      const result = playerStore.usePet(item)
      if (result.success) {
        message.success(result.message)
      } else {
        message.error(result.message || '操作失败')
      }
    }
  }

  // 装备属性对比计算
  const equipmentComparison = computed(() => {
    if (!selectedEquipment.value) return null
    const currentEquipment = playerStore.equippedArtifacts[selectedEquipment.value.type]
    if (!currentEquipment || currentEquipment.id === selectedEquipment.value.id) return null
    const comparison: Record<string, { current: number; selected: number; diff: number; isPositive: boolean }> = {}
    const selected = selectedEquipment.value
    const allStats = new Set([...Object.keys(selected.stats), ...Object.keys(currentEquipment.stats)])
    allStats.forEach(stat => {
      const selectedValue = selected.stats[stat] || 0
      const currentValue = currentEquipment.stats[stat] || 0
      const diff = selectedValue - currentValue
      comparison[stat] = {
        current: currentValue,
        selected: selectedValue,
        diff: diff,
        isPositive: diff > 0
      }
    })
    return comparison
  })

  const options = [
    { label: '全部品阶', value: 'all' },
    { label: '神品', value: 'divine' },
    { label: '仙品', value: 'celestial' },
    { label: '玄品', value: 'mystic' },
    { label: '灵品', value: 'spiritual' },
    { label: '凡品', value: 'mortal' }
  ]
  watch(() => route.path, () => {
    showEquipmentModal.value = false
    showEquipmentDetailModal.value = false
    showPetModal.value = false
    showReleaseConfirm.value = false
    showBatchReleaseConfirm.value = false
    showReforgeConfirm.value = false
  })
</script>

<style scoped>
  .pet-training-row { display: grid; gap: 6px; margin: 6px 0; }
  .pet-trait { font-weight: 600; }
  .pet-auto-settings { margin-bottom: 10px; }
  .character-page { max-width:860px; margin-inline:auto; }
  .character-heading,.loadout-tools,.current-worn { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .character-heading {padding:8px 0 14px; border-bottom:2px solid #718e7d;}
  .character-heading h2 {font:700 26px/1.25 "Songti SC",SimSun,serif;margin:4px 0;overflow-wrap:anywhere;}
  .character-heading small {font-size:12px;}
  .pet-switch {display:flex;align-items:center;gap:10px;padding:5px 8px;cursor:pointer;background:transparent;border:0;border-left:1px solid #85998766;color:inherit;text-align:start;}
  .pet-switch strong,.pet-switch small {display:block;}
  .pet-switch svg,.pet-switch .pet-art {width:30px;height:32px;color:#638575;}
  .loadout-tools {margin-top:12px;}
  .loadout-tools h3 {font:600 17px serif;margin:0;}
  .current-worn {padding:10px 0;border-bottom:1px solid #83998755;}
  .worn-stats {width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:4px 20px;margin:0;}
  .worn-stats div {display:flex;justify-content:space-between;gap:8px;}
  .worn-stats dd {margin:0;font-variant-numeric:tabular-nums;font-weight:600;}
  .pet-art {width:48px;height:48px;object-fit:contain;vertical-align:middle;}
  .companion-slot .pet-art {width:28px;height:32px;}
  .gear-sort { padding: 5px 8px; border: 1px solid #889b9570; border-radius: 4px; background: var(--n-color, Canvas); color: inherit; font: inherit; cursor: pointer; }
  .companion-slot { width:100%; min-height:48px; display:grid; grid-template-columns:28px minmax(0,1fr); align-items:center; gap:0 6px; padding:6px; background:transparent; color:inherit; border:1px solid #789987; border-radius:5px; font:inherit; text-align:start; cursor:pointer; overflow-wrap:anywhere; }
  .companion-slot svg { width:26px; height:26px; color:#648a7a; grid-row:span 2; }
  .companion-slot small { grid-column:1/-1; }
  @media(max-width:540px){.companion-slot {grid-template-columns:1fr;justify-items:center;text-align:center;}.companion-slot svg {grid-row:auto;}}
  .cultivator { background: #e6efee url('/cultivator-scroll.svg') right center / auto 100% no-repeat; position: relative; min-height: 185px; overflow: hidden; border-bottom: 3px solid #597f78; }
  .dossier { position: relative; padding: 20px; width: max-content; max-width: 49%; color: #223d3d; background: #e6efeee8; }
  .realm-seal { display: inline-block; border: 1px solid #995549; color: #864437; font: 600 13px serif; padding: 1px 6px; }
  .dossier h2 { font: 700 30px/1.25 "Songti SC", SimSun, serif; margin: 8px 0; overflow-wrap: anywhere; }
  .dossier small,.gear-pick small { display: block; }
  .dossier .n-button { margin-top: 9px; }
  .xp-track { height: 4px; background: #c2d0c9; max-width: 140px; }
  .xp-track i { display: block; height: 100%; background: #568577; }
  .forge-page { width: min(100%, 820px); margin-inline: auto; }
  .forge-header,.forge-wallet,.forge-actions,.forge-preview-head,.forge-identity { display: flex; align-items: center; flex-wrap: wrap; }
  .forge-header,.forge-preview-head { justify-content: space-between; gap: 8px 16px; }
  .forge-header { padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .forge-wallet { gap: 16px; color: var(--muted); }
  .forge-wallet b { margin-left: 4px; color: var(--ink); font-variant-numeric: tabular-nums; }
  .forge-page :deep(.loadout) { margin: 14px auto 0; }
  .forge-controls { max-width: 720px; margin: 0 auto; }
  .forge-actions { justify-content: center; gap: 12px; padding: 12px 0; }
  .forge-actions .n-button { min-width: 114px; }
  .focus-select { font:inherit; color:var(--ink); background:var(--panel); padding:5px 8px; border:1px solid var(--line); border-radius:4px; }
  .focus-details { display:flex; align-items:baseline; gap:8px 18px; flex-wrap:wrap; padding-top:8px; }
  .focus-details details { margin-inline-start:auto; }
  .focus-details summary { cursor:pointer; color:var(--muted); }
  .forge-result { text-align: center; margin: 0 0 10px; }
  .forge-preview { padding: 12px 16px; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; }
  .forge-identity { gap: 8px; }
  .forge-preview-head > span,.forge-stats dt { color: var(--muted); font-size: .92em; }
  .forge-stats { display: flex; gap: 8px 22px; flex-wrap: wrap; margin: 8px 0 0; }
  .forge-stats > div { display: flex; align-items: baseline; gap: 6px; }
  .forge-stats dd { margin: 0; font-variant-numeric: tabular-nums; }
  .forge-reserve { margin-top: 20px; }
  .attribute-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 9px 20px; padding: 10px 0; }
  .attribute-strip b { font-variant-numeric: tabular-nums; }
  .gear-list { display: grid; gap: 5px; }
  .gear-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 8px 12px; border: 1px solid #889b952e; border-left: 3px solid #899b98; }
  .gear-row.chosen { border-left-color: #32856f; background: #80aa9719; }
  .gear-pick { flex: 1 1 135px; color: inherit; border: none; background: none; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 9px; overflow-wrap: anywhere; }
  .gear-pick small,.empty-slot { opacity: .72; }
  .equipment-slot { flex-wrap: wrap; }
  @media(max-width: 540px) { .cultivator {background-position: 74% center;} .dossier {padding: 13px;} .gear-row {padding: 7px;} }
  .retry-entry { margin-bottom: 12px; }
  .bag-gear { display: grid; grid-template-columns: minmax(155px, 1fr) minmax(180px, 2fr) minmax(95px, auto) auto; gap: 8px 18px; align-items: center; padding: 10px 0; border-bottom: 1px solid #889b9545; }
  .gear-identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .gear-identity .n-button { max-width: 100%; white-space: normal; height: auto; text-align: start; }
  .gear-meta { margin-top: 3px; font-size: 12px; }
  .gear-score { text-align: end; font-variant-numeric: tabular-nums; }
  @media (max-width: 820px) { .bag-gear { grid-template-columns: 1fr auto; } .bag-gear .equip-comparison { grid-column: 1/-1; grid-row: auto; } .gear-score { text-align: start; } }
  .equipment-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 0 16px; }
  .equipment-slot { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(128,128,128,.28); }
  .equipped-item { background: transparent; color: inherit; font: inherit; border: 0; cursor: pointer; padding: 8px 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; }
  .quality-guide summary { cursor: pointer; }

  .quality-guide ol,.quality-guide ul { display:flex; flex-wrap:wrap; gap:4px 12px; margin:8px 0; padding:0; list-style:none; }
  .quality-guide [aria-current] { font-weight:700; text-decoration:underline; text-underline-offset:3px; }

  .n-card {
    cursor: pointer;
  }

  .reforge-compare {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 16px 0;
  }

  .old-stats,
  .new-stats {
    flex: 1;
    padding: 16px;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.05);
  }

  .old-stats h3,
  .new-stats h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
    color: #666;
  }
  .character-stats { margin: 12px 0 18px; }
  .character-stats summary { cursor: pointer; }
  .stat-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 24px; padding: 16px 0; }
  .stat-groups h3 { font-size: 14px; margin-bottom: 8px; }
  .stat-groups dl { display: grid; grid-template-columns: 1fr auto; line-height: 2; }
  .stat-groups dd { font-variant-numeric: tabular-nums; }
</style>
