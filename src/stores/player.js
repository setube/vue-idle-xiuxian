import { defineStore } from 'pinia'
import { GameDB } from './db'
import { pillRecipes, tryCreatePill, calculatePillEffect } from '../plugins/pills'
import { encryptData, decryptData, validateData } from '../plugins/crypto'
import { getRealmName, getRealmLength } from '../plugins/realm'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    // 是否新玩家
    isNewPlayer: true,
    // GM模式开关
    isGMMode: true,
    // 主题设置
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    // 灵宠系统
    activePet: null, // 当前出战的灵宠
    petEssence: 0, // 灵宠精华
    petConfig: {
      rarityMap: {
        divine: { name: '神品', color: '#FF0000', probability: 0.02, essenceBonus: 50 },
        celestial: { name: '仙品', color: '#FFD700', probability: 0.08, essenceBonus: 30 },
        mystic: { name: '玄品', color: '#9932CC', probability: 0.15, essenceBonus: 20 },
        spiritual: { name: '灵品', color: '#1E90FF', probability: 0.25, essenceBonus: 10 },
        mortal: { name: '凡品', color: '#32CD32', probability: 0.5, essenceBonus: 5 }
      }
    },
    // 基础属性
    name: '无名修士',
    nameChangeCount: 0,  // 道号修改次数
    level: 1,  // 境界等级
    realm: '练气期一层',  // 当前境界名称
    cultivation: 0,  // 当前修为值
    maxCultivation: 100,  // 当前境界最大修为值
    spirit: 0,  // 灵力值
    spiritRate: 1,  // 灵力获取倍率
    luck: 1,  // 幸运值
    cultivationRate: 1,  // 修炼速率
    herbRate: 1,  // 灵草获取倍率
    alchemyRate: 1,  // 炼丹成功率加成
    // 丹药系统
    pills: [],  // 丹药库存
    pillFragments: {},  // 丹方残页（key为丹方ID，value为数量）
    pillRecipes: [],  // 已获得的完整丹方
    activeEffects: [],  // 当前生效的丹药效果列表
    pillsCrafted: 0,  // 炼制丹药次数
    pillsConsumed: 0,  // 服用丹药次数
    // 基础战斗属性
    baseAttributes: {
      attack: 10, // 攻击
      health: 100, // 生命
      defense: 5, // 防御
      speed: 10 // 速度
    },
    // 战斗属性
    combatAttributes: {
      critRate: 0,     // 暴击率
      comboRate: 0,    // 连击率
      counterRate: 0,  // 反击率
      stunRate: 0,     // 眩晕率
      dodgeRate: 0,    // 闪避率
      vampireRate: 0   // 吸血率
    },
    // 战斗抗性
    combatResistance: {
      critResist: 0,    // 抗暴击
      comboResist: 0,   // 抗连击
      counterResist: 0, // 抗反击
      stunResist: 0,    // 抗眩晕
      dodgeResist: 0,   // 抗闪避
      vampireResist: 0  // 抗吸血
    },
    // 特殊属性
    specialAttributes: {
      healBoost: 0,        // 强化治疗
      critDamageBoost: 0,  // 强化爆伤
      critDamageReduce: 0, // 弱化爆伤
      finalDamageBoost: 0, // 最终增伤
      finalDamageReduce: 0,// 最终减伤
      combatBoost: 0,      // 战斗属性提升
      resistanceBoost: 0   // 战斗抗性提升
    },
    // 资源
    spiritStones: 0,  // 灵石数量
    reinforceStones: 0, // 强化石数量
    refinementStones: 0, // 洗练石数量
    herbs: [],  // 灵草库存
    items: [],  // 物品库存
    artifacts: [],  // 法宝装备
    // 装备栏位
    equippedArtifacts: {
      weapon: null, // 武器
      head: null, // 头部
      body: null, // 衣服
      legs: null, // 裤子
      feet: null, // 鞋子
      shoulder: null, // 肩甲
      hands: null, // 手套
      wrist: null, // 护腕
      necklace: null, // 项链
      ring1: null, // 戒指1
      ring2: null, // 戒指2
      belt: null, // 腰带
      artifact: null // 法宝
    },
    // 装备加成属性
    artifactBonuses: {
      // 基础属性加成
      attack: 0,
      health: 0,
      defense: 0,
      speed: 0,
      // 战斗属性加成
      critRate: 0,
      comboRate: 0,
      counterRate: 0,
      stunRate: 0,
      dodgeRate: 0,
      vampireRate: 0,
      // 抗性加成
      critResist: 0,
      comboResist: 0,
      counterResist: 0,
      stunResist: 0,
      dodgeResist: 0,
      vampireResist: 0,
      // 特殊属性加成
      healBoost: 0,
      critDamageBoost: 0,
      critDamageReduce: 0,
      finalDamageBoost: 0,
      finalDamageReduce: 0,
      combatBoost: 0,
      resistanceBoost: 0,
      // 修炼相关加成
      cultivationRate: 1,
      spiritRate: 1
    },
    // 统计数据
    totalCultivationTime: 0,  // 总修炼时间
    breakthroughCount: 0,  // 突破次数
    explorationCount: 0,  // 探索次数
    itemsFound: 0,  // 获得物品数量
    eventTriggered: 0,  // 触发事件次数
    unlockedPillRecipes: 0,  // 解锁丹方数量
    // 秘境相关数据
    dungeonDifficulty: 1, // 难度选择
    dungeonHighestFloor: 0,  // 最高通关层数
    dungeonHighestFloor_2: 0,  // 最高通关层数
    dungeonHighestFloor_5: 0,  // 最高通关层数
    dungeonHighestFloor_10: 0,  // 最高通关层数
    dungeonHighestFloor_100: 0,  // 最高通关层数
    dungeonLastFailedFloor: 0,  // 最后失败层数
    dungeonTotalRuns: 0,  // 总探索次数
    dungeonBossKills: 0,  // Boss击杀数
    dungeonEliteKills: 0,  // 精英击杀数
    dungeonTotalKills: 0,  // 总击杀数
    dungeonDeathCount: 0,  // 死亡次数
    dungeonTotalRewards: 0,  // 获得奖励次数
    // 自动出售相关设置
    autoSellQualities: [], // 选中的装备品质
    autoReleaseRarities: [], // 选中的灵宠品质
    // 心愿单相关设置
    wishlistEnabled: false, // 心愿单开关
    selectedWishEquipQuality: null,
    selectedWishPetRarity: null,
    // 成就与解锁项
    unlockedRealms: ['练气一层'],  // 已解锁境界
    unlockedLocations: ['新手村'],  // 已解锁地点
    unlockedSkills: [],  // 已解锁功法
    completedAchievements: [],  // 已完成成就
  }),
  getters: {
    // 获取灵宠的属性加成
    getPetBonus () {
      if (!this.activePet) return {
        attack: 0, defense: 0, health: 0,
        critRate: 0, comboRate: 0, counterRate: 0,
        stunRate: 0, dodgeRate: 0, vampireRate: 0,
        critResist: 0, comboResist: 0, counterResist: 0,
        stunResist: 0, dodgeResist: 0, vampireResist: 0,
        healBoost: 0, critDamageBoost: 0, critDamageReduce: 0,
        finalDamageBoost: 0, finalDamageReduce: 0,
        combatBoost: 0, resistanceBoost: 0
      };
      const qualityBonusMap = {
        divine: 0.15,    // 神品基础加成15%
        celestial: 0.12, // 仙品基础加成12%
        mystic: 0.09,    // 玄品基础加成9%
        spiritual: 0.06, // 灵品基础加成6%
        mortal: 0.03     // 凡品基础加成3%
      };
      const starBonusPerQuality = {
        divine: 0.02,    // 神品每星+2%
        celestial: 0.01, // 仙品每星+1%
        mystic: 0.01,    // 玄品每星+1%
        spiritual: 0.01, // 灵品每星+1%
        mortal: 0.01     // 凡品每星+1%
      };
      const baseBonus = qualityBonusMap[this.activePet.rarity] || 0;
      const starBonus = ((this.activePet.star || 0) * (starBonusPerQuality[this.activePet.rarity] || 0));
      const levelBonus = ((this.activePet.level || 1) - 1) * (baseBonus * 0.1);
      const totalBonus = baseBonus + starBonus + levelBonus;
      const phase = Math.floor((this.activePet.star || 0) / 5);
      const phaseBonus = phase * (baseBonus * 0.5);
      const finalBonus = totalBonus + phaseBonus;
      const combatBonus = finalBonus * 0.5;
      return {
        attack: finalBonus,
        defense: finalBonus,
        health: finalBonus,
        critRate: combatBonus,
        comboRate: combatBonus,
        counterRate: combatBonus,
        stunRate: combatBonus,
        dodgeRate: combatBonus,
        vampireRate: combatBonus,
        critResist: combatBonus,
        comboResist: combatBonus,
        counterResist: combatBonus,
        stunResist: combatBonus,
        dodgeResist: combatBonus,
        vampireResist: combatBonus,
        healBoost: combatBonus,
        critDamageBoost: combatBonus,
        critDamageReduce: combatBonus,
        finalDamageBoost: combatBonus,
        finalDamageReduce: combatBonus,
        combatBoost: combatBonus,
        resistanceBoost: combatBonus
      };
    }
  },
  actions: {
    // 更新HTML暗黑模式类
    updateHtmlDarkMode (isDarkMode) {
      const htmlEl = document.documentElement
      if (isDarkMode) {
        htmlEl.classList.add('dark')
      } else {
        htmlEl.classList.remove('dark')
      }
    },
    // 初始化玩家数据
    async initializePlayer () {
      try {
        const savedData = await GameDB.getData('playerData')
        if (savedData) {
          const decryptedData = decryptData(savedData)
          if (decryptedData && validateData(decryptedData)) {
            Object.assign(this.$state, decryptedData)
          } else {
            console.error('存档数据验证失败，使用初始数据')
          }
        }
      } catch (error) {
        console.error('加载存档失败:', error)
      }
      // 初始化主题设置
      this.isDarkMode = localStorage.getItem('darkMode') === 'true'
      // 同步暗黑模式状态到HTML标签
      this.updateHtmlDarkMode(this.isDarkMode)
    },
    // 切换暗黑模式
    toggle () {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('darkMode', this.isDarkMode)
      // 更新html标签的class
      this.updateHtmlDarkMode(this.isDarkMode)
      this.saveData()
    },
    // 保存数据到IndexedDB
    async saveData () {
      const encryptedData = encryptData(this.$state)
      if (encryptedData) {
        try {
          await GameDB.setData('playerData', encryptedData)
        } catch (error) {
          console.error('数据保存失败:', error)
        }
      } else {
        console.error('数据加密失败')
      }
    },
    // 导出存档数据
    async exportData () {
      try {
        const data = await GameDB.getData('playerData')
        return data
      } catch (error) {
        console.error('导出存档失败:', error)
        throw error
      }
    },
    // 导入存档数据
    async importData (encryptedData) {
      try {
        await GameDB.setData('playerData', encryptedData)
        this.$reset()
        await this.initializePlayer()
      } catch (error) {
        console.error('导入存档失败:', error)
        throw error
      }
    },
    // 清除存档数据
    async clearData () {
      try {
        await GameDB.setData('playerData', null)
      } catch (error) {
        console.error('清除存档失败:', error)
        throw error
      }
    },
    // 获取灵力
    gainSpirit (amount) {
      this.spirit += amount * this.spiritRate
      this.saveData()
    },
    // 修炼增加修为
    cultivate (amount) {
      // 确保amount是数字类型
      const numAmount = Number(String(amount).replace(/[^0-9.-]/g, '')) || 0;
      this.cultivation = Number(String(this.cultivation).replace(/[^0-9.-]/g, '')) || 0;
      this.cultivation += numAmount;
      this.totalCultivationTime += 1;  // 增加修炼时间统计
      if (this.cultivation >= this.maxCultivation) {
        this.tryBreakthrough();
      }
      this.saveData()
    },
    // 尝试突破
    tryBreakthrough () {
      // 境界等级对应的境界名称和修为上限
      const realmsLength = getRealmLength()
      // 检查是否可以突破到下一个境界
      if (this.level < realmsLength) {
        const nextRealm = getRealmName(this.level)
        // 更新境界信息
        this.level += 1
        this.realm = nextRealm.name  // 使用完整的境界名称（如：练气一层）
        this.maxCultivation = nextRealm.maxCultivation
        this.cultivation = 0  // 重置修为值
        this.breakthroughCount += 1  // 增加突破次数
        // 解锁新境界
        if (!this.unlockedRealms.includes(nextRealm.name)) {
          this.unlockedRealms.push(nextRealm.name)
        }
        // 突破奖励
        this.spirit += 100 * this.level  // 获得灵力奖励
        this.spiritRate *= 1.2  // 提升灵力获取倍率
        this.saveData()
        return true
      }
      return false
    },
    // 获得物品
    gainItem (item) {
      this.items.push(item)
      this.itemsFound++  // 增加获得物品统计
      this.saveData()
    },
    // 使用物品（丹药或灵宠）
    useItem (item) {
      if (item.type === 'pill') {
        return this.usePill(item)
      } else if (item.type === 'pet') {
        return this.usePet(item)
      }
      return { success: false, message: '无法使用该物品' }
    },
    // 卖出装备
    async sellEquipment (equipment) {
      const index = this.items.findIndex(i => i.id === equipment.id)
      if (index === -1) {
        return { success: false, message: '装备不存在' }
      }
      return new Promise((resolve) => {
        const worker = new Worker(new URL('../workers/equipment.js', import.meta.url))
        worker.onmessage = (e) => {
          const { stoneAmount, itemId } = e.data
          this.reinforceStones += stoneAmount
          const index = this.items.findIndex(i => i.id === itemId)
          if (index > -1) {
            this.items.splice(index, 1)
          }
          this.saveData()
          worker.terminate()
          resolve({ success: true, message: `成功卖出装备，获得${stoneAmount}个强化石` })
        }
        // 只传递必要的数据
        worker.postMessage({
          type: 'single',
          equipment: {
            id: equipment.id,
            quality: equipment.quality
          }
        })
      })
    },
    // 批量卖出装备
    async batchSellEquipments (quality = null, equipmentType = null) {
      return new Promise((resolve) => {
        const worker = new Worker(new URL('../workers/equipment.js', import.meta.url))
        worker.onmessage = (e) => {
          const { totalStones, itemsToRemove, count } = e.data
          this.reinforceStones += totalStones
          this.items = this.items.filter(item => !itemsToRemove.includes(item.id))
          this.saveData()
          worker.terminate()
          resolve({
            success: true,
            message: `成功卖出${count}件装备，获得${totalStones}个强化石`
          })
        }
        // 将数据转换为纯对象数组
        const itemsToSell = this.items
          .filter(item => {
            if (!item || !item.type || item.type === 'pill' || item.type === 'pet') return false
            if (equipmentType && item.type !== equipmentType) return false
            if (quality && item.quality !== quality) return false
            return true
          }).map(item => ({
            id: item.id,
            type: item.type,
            quality: item.quality
          }))
        // 发送简化后的数据
        worker.postMessage({
          type: 'batch',
          items: JSON.parse(JSON.stringify(itemsToSell)),
          quality,
          equipmentType
        })
      })
    },
    // 使用丹药
    usePill (pill) {
      const now = Date.now()
      // 添加效果
      this.activeEffects.push({
        ...pill.effect,
        startTime: now,
        endTime: now + (pill.effect.duration * 1000)
      })
      // 移除已使用的丹药
      const index = this.items.findIndex(i => i.id === pill.id)
      if (index > -1) {
        this.items.splice(index, 1)
        this.pillsConsumed++
      }
      // 清理过期效果
      this.activeEffects = this.activeEffects.filter(effect => effect.endTime > now)
      this.saveData()
      return { success: true, message: '使用丹药成功' }
    },
    // 炼制丹药
    craftPill (recipeId) {
      const recipe = pillRecipes.find(r => r.id === recipeId)
      if (!recipe) return { success: false, message: '丹方不存在' }
      // 尝试炼制丹药
      const result = tryCreatePill(recipe, this.herbs, this, this.pillFragments[recipe.id] || 0, this.luck * this.alchemyRate)
      if (result.success) {
        // 消耗材料
        for (const material of recipe.materials) {
          for (let i = 0; i < material.count; i++) {
            const index = this.herbs.findIndex(h => h.id === material.herb)
            if (index > -1) {
              this.herbs.splice(index, 1)
            }
          }
        }
        // 计算丹药效果
        const effect = calculatePillEffect(recipe, this.level)
        // 添加到物品栏
        this.items.push({
          id: `${recipe.id}_${Date.now()}`,
          name: recipe.name,
          type: 'pill',
          description: recipe.description,
          effect: effect
        })
        this.pillsCrafted++
        this.saveData()
      }
      return result
    },
    // 使用灵宠（出战/召回）
    usePet (pet) {
      // 如果当前没有出战灵宠，直接出战新灵宠
      if (!this.activePet) {
        return this.deployPet(pet)
      }
      // 如果点击的是当前出战灵宠，则召回
      if (this.activePet.id === pet.id) {
        return this.recallPet()
      }
      // 如果点击的是其他灵宠，先召回当前灵宠，再出战新灵宠
      this.recallPet()
      return this.deployPet(pet)
    },
    // 召回灵宠
    recallPet () {
      if (!this.activePet) {
        return { success: false, message: '当前没有出战的灵宠' }
      }
      // 重置所有属性加成
      this.resetPetBonuses()
      this.activePet = null
      this.saveData()
      return { success: true, message: '召回成功' }
    },
    // 出战灵宠
    deployPet (pet) {
      // 如果已有灵宠出战，先召回
      if (this.activePet) {
        this.recallPet()
      }
      // 出战新灵宠
      this.activePet = pet
      // 应用灵宠属性加成
      this.applyPetBonuses()
      this.saveData()
      return { success: true, message: '出战成功' }
    },
    // 重置灵宠属性加成
    resetPetBonuses () {
      const petBonus = this.activePet.combatAttributes;
      // 保存原始属性值
      const originalBaseAttributes = { ...this.baseAttributes };
      const originalCombatAttributes = { ...this.combatAttributes };
      const originalCombatResistance = { ...this.combatResistance };
      const originalSpecialAttributes = { ...this.specialAttributes };
      // 更新基础属性
      this.baseAttributes.attack = originalBaseAttributes.attack - petBonus.attack;
      this.baseAttributes.defense = originalBaseAttributes.defense - petBonus.defense;
      this.baseAttributes.health = originalBaseAttributes.health - petBonus.health;
      this.baseAttributes.speed = originalBaseAttributes.speed - petBonus.speed;
      // 更新战斗属性
      Object.keys(this.combatAttributes).forEach(key => {
        this.combatAttributes[key] = originalCombatAttributes[key] - (petBonus[key] || 0);
      });
      // 更新战斗抗性
      Object.keys(this.combatResistance).forEach(key => {
        this.combatResistance[key] = originalCombatResistance[key] - (petBonus[key] || 0);
      });
      // 更新特殊属性
      Object.keys(this.specialAttributes).forEach(key => {
        this.specialAttributes[key] = originalSpecialAttributes[key] - (petBonus[key] || 0);
      });
    },
    // 应用灵宠属性加成
    applyPetBonuses () {
      if (!this.activePet) return;
      const petBonus = this.activePet.combatAttributes;
      // 保存原始属性值
      const originalBaseAttributes = { ...this.baseAttributes };
      const originalCombatAttributes = { ...this.combatAttributes };
      const originalCombatResistance = { ...this.combatResistance };
      const originalSpecialAttributes = { ...this.specialAttributes };
      // 更新基础属性
      this.baseAttributes.attack = originalBaseAttributes.attack + petBonus.attack;
      this.baseAttributes.defense = originalBaseAttributes.defense + petBonus.defense;
      this.baseAttributes.health = originalBaseAttributes.health + petBonus.health;
      this.baseAttributes.speed = originalBaseAttributes.speed + petBonus.speed;
      // 更新战斗属性
      Object.keys(this.combatAttributes).forEach(key => {
        this.combatAttributes[key] = originalCombatAttributes[key] + (petBonus[key] || 0);
      });
      // 更新战斗抗性
      Object.keys(this.combatResistance).forEach(key => {
        this.combatResistance[key] = originalCombatResistance[key] + (petBonus[key] || 0);
      });
      // 更新特殊属性
      Object.keys(this.specialAttributes).forEach(key => {
        this.specialAttributes[key] = originalSpecialAttributes[key] + (petBonus[key] || 0);
      });
    },
    // 穿上装备
    equipArtifact (artifact, slot) {
      // 检查境界要求
      if (artifact.requiredRealm && this.level < artifact.requiredRealm) {
        return { success: false, message: '境界不足，无法装备此装备' };
      }
      // 先卸下当前装备
      if (this.equippedArtifacts[slot]) {
        this.unequipArtifact(slot);
      }
      // 从背包中移除装备
      const index = this.items.findIndex((item) => item.id === artifact.id);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
      // 穿上新装备
      this.equippedArtifacts[slot] = artifact;
      // 应用装备加成
      if (artifact.stats) {
        Object.entries(artifact.stats).forEach(([key, value]) => {
          // 先更新artifactBonuses
          if (this.artifactBonuses[key] !== undefined) {
            this.artifactBonuses[key] += value;
            // 根据属性类型应用到对应的属性组
            if (key in this.baseAttributes) {
              this.baseAttributes[key] += value;
            } else if (key in this.combatAttributes) {
              this.combatAttributes[key] = Math.min(1, this.combatAttributes[key] + value);
            } else if (key in this.combatResistance) {
              this.combatResistance[key] = Math.min(1, this.combatResistance[key] + value);
            } else if (key in this.specialAttributes) {
              this.specialAttributes[key] += value;
            }
          }
        });
      }
      this.saveData();
      return { success: true, message: '装备成功' };
    },
    // 卸下装备
    unequipArtifact (slot) {
      const artifact = this.equippedArtifacts[slot];
      if (artifact) {
        // 移除装备加成
        if (artifact.stats) {
          Object.entries(artifact.stats).forEach(([key, value]) => {
            if (this.artifactBonuses[key] !== undefined) {
              this.artifactBonuses[key] -= value;
              // 从对应的属性组中移除加成
              if (key in this.baseAttributes) {
                this.baseAttributes[key] -= value;
              } else if (key in this.combatAttributes) {
                this.combatAttributes[key] = Math.max(0, this.combatAttributes[key] - value);
              } else if (key in this.combatResistance) {
                this.combatResistance[key] = Math.max(0, this.combatResistance[key] - value);
              } else if (key in this.specialAttributes) {
                this.specialAttributes[key] -= value;
              }
            }
          });
        }
        // 将装备返回到背包
        this.items.push(artifact);
        this.equippedArtifacts[slot] = null;
        this.saveData();
        return true;
      }
      return false;
    },
    // 获取装备总加成
    getArtifactBonus (type) {
      return this.artifactBonuses[type] || 1
    },
    // 获得丹方残页
    gainPillFragment (recipeId) {
      if (!this.pillFragments[recipeId]) {
        this.pillFragments[recipeId] = 0
      }
      this.pillFragments[recipeId]++
      // 检查是否可以合成完整丹方
      const recipe = pillRecipes.find(r => r.id === recipeId)
      if (recipe && this.pillFragments[recipeId] >= recipe.fragmentsNeeded) {
        this.pillFragments[recipeId] -= recipe.fragmentsNeeded
        if (!this.pillRecipes.includes(recipeId)) {
          this.pillRecipes.push(recipeId)
          this.unlockedPillRecipes++
        }
      }
      this.saveData()
    },
    // 炼制丹药
    craftPill (recipeId) {
      const recipe = pillRecipes.find(r => r.id === recipeId)
      if (!recipe || !this.pillRecipes.includes(recipeId)) {
        return { success: false, message: '未掌握丹方' }
      }
      const fragments = this.pillFragments[recipeId] || 0
      const result = tryCreatePill(recipe, this.herbs, this, fragments, this.luck * this.alchemyRate)
      if (result.success) {
        // 消耗材料
        recipe.materials.forEach(material => {
          for (let i = 0; i < material.count; i++) {
            const index = this.herbs.findIndex(h => h.id === material.herb)
            if (index > -1) {
              this.herbs.splice(index, 1)
            }
          }
        })
        // 创建丹药
        const effect = calculatePillEffect(recipe, this.level)
        const pill = {
          id: `${recipe.id}_${Date.now()}`,
          name: recipe.name,
          description: recipe.description,
          type: 'pill',
          effect
        }
        this.items.push(pill)
        this.pillsCrafted++
        this.saveData()
      }
      return result
    },
    // 使用丹药
    useItem (item) {
      if (item.type === 'pill') {
        const now = Date.now()
        // 添加效果
        this.activeEffects.push({
          ...item.effect,
          startTime: now,
          endTime: now + (item.effect.duration * 1000)
        })
        // 移除已使用的丹药
        const index = this.items.findIndex(i => i.id === item.id)
        if (index > -1) {
          this.items.splice(index, 1)
          this.pillsConsumed++
        }
        // 清理过期效果
        this.activeEffects = this.activeEffects.filter(effect => effect.endTime > now)
        this.saveData()
        return true
      }
      return false
    },
    // 获取当前有效的丹药效果
    getActiveEffects () {
      const now = Date.now()
      return this.activeEffects.filter(effect => effect.endTime > now)
    },
    // 添加装备到背包
    addEquipment (equipment) {
      if (!this.items) {
        this.items = []
      }
      this.items.push(equipment)
      this.saveData()
    },
    // 升级灵宠
    upgradePet (pet, essenceCount) {
      if (this.petEssence < essenceCount) {
        return { success: false, message: '灵宠精华不足' };
      }
      // 消耗精华并提升等级
      this.petEssence -= essenceCount;
      const petIndex = this.items.findIndex(item => item.id === pet.id);
      if (petIndex > -1) {
        const currentPet = this.items[petIndex];
        currentPet.level = (currentPet.level || 1) + 1;
        // 根据品质和等级提升战斗属性
        const qualityMultiplier = {
          divine: 2.0,
          celestial: 1.8,
          mystic: 1.6,
          spiritual: 1.4,
          mortal: 1.2
        }[currentPet.rarity] || 1.2;
        // 更新战斗属性
        currentPet.combatAttributes = {
          attack: Math.floor(currentPet.combatAttributes.attack * (1 + 0.01 * qualityMultiplier)),
          health: Math.floor(currentPet.combatAttributes.health * (1 + 0.01 * qualityMultiplier)),
          defense: Math.floor(currentPet.combatAttributes.defense * (1 + 0.01 * qualityMultiplier)),
          speed: Math.floor(currentPet.combatAttributes.speed * (1 + 0.01 * qualityMultiplier)),

          critRate: currentPet.combatAttributes.critRate + 0.01 * qualityMultiplier,
          comboRate: currentPet.combatAttributes.comboRate + 0.01 * qualityMultiplier,
          counterRate: currentPet.combatAttributes.counterRate + 0.01 * qualityMultiplier,
          stunRate: currentPet.combatAttributes.stunRate + 0.01 * qualityMultiplier,
          dodgeRate: currentPet.combatAttributes.dodgeRate + 0.01 * qualityMultiplier,
          vampireRate: currentPet.combatAttributes.vampireRate + 0.01 * qualityMultiplier,

          critResist: currentPet.combatAttributes.critResist + 0.01 * qualityMultiplier,    // 抗暴击
          comboResist: currentPet.combatAttributes.comboResist + 0.01 * qualityMultiplier,   // 抗连击
          counterResist: currentPet.combatAttributes.counterResist + 0.01 * qualityMultiplier, // 抗反击
          stunResist: currentPet.combatAttributes.stunResist + 0.01 * qualityMultiplier,    // 抗眩晕
          dodgeResist: currentPet.combatAttributes.dodgeResist + 0.01 * qualityMultiplier,   // 抗闪避
          vampireResist: currentPet.combatAttributes.vampireResist + 0.01 * qualityMultiplier,  // 抗吸血

          healBoost: currentPet.combatAttributes.healBoost + 0.01 * qualityMultiplier,
          critDamageBoost: currentPet.combatAttributes.critDamageBoost + 0.01 * qualityMultiplier,
          critDamageReduce: currentPet.combatAttributes.critDamageReduce + 0.01 * qualityMultiplier,
          finalDamageBoost: currentPet.combatAttributes.finalDamageBoost + 0.01 * qualityMultiplier,
          finalDamageReduce: currentPet.combatAttributes.finalDamageReduce + 0.01 * qualityMultiplier,
          combatBoost: currentPet.combatAttributes.combatBoost + 0.01 * qualityMultiplier,
          resistanceBoost: currentPet.combatAttributes.resistanceBoost + 0.01 * qualityMultiplier

        };
        // 如果是当前出战的灵宠，重新应用属性加成
        if (this.activePet && this.activePet.id === pet.id) {
          this.applyPetBonuses();
        }
      }
      this.saveData();
      return { success: true, message: '升级成功' };
    },
    // 升星灵宠
    evolvePet (pet, foodPet) {
      // 检查是否是相同品质和名字的灵宠
      if (pet.rarity != foodPet.rarity || pet.name != foodPet.name) {
        return { success: false, message: '只能使用相同品质和名字的灵宠进行升星' }
      }
      const petIndex = this.items.findIndex(item => item.id === pet.id)
      const foodPetIndex = this.items.findIndex(item => item.id === foodPet.id)
      if (petIndex > -1 && foodPetIndex > -1) {
        // 返还作为升星材料的灵宠已消耗的精华
        const returnEssence = (foodPet.level - 1) * 10 // 假设每级消耗10精华
        this.petEssence += returnEssence
        // 移除作为材料的灵宠
        this.items.splice(foodPetIndex, 1)
        // 提升目标灵宠星级
        this.items[petIndex].star = (this.items[petIndex].star || 0) + 1
        this.saveData()
        return { success: true, message: '升星成功' }
      }
      return { success: false, message: '升星失败' }
    },
  },
})
