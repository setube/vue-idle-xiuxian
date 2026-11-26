<template>
  <n-layout>
    <n-layout-content class="gm-content">
      <n-card title="基础属性修改">
        <n-form>
          <n-form-item label="道号">
            <n-input v-model:value="baseAttributes.name" />
          </n-form-item>
          <n-form-item label="境界等级">
            <n-input-number v-model:value="baseAttributes.level" />
          </n-form-item>
          <n-form-item label="境界名称">
            <n-input v-model:value="baseAttributes.realm" />
          </n-form-item>
          <n-form-item label="当前修为">
            <n-input-number v-model:value="baseAttributes.cultivation" />
          </n-form-item>
          <n-form-item label="最大修为">
            <n-input-number v-model:value="baseAttributes.maxCultivation" />
          </n-form-item>
          <n-form-item label="灵力">
            <n-input-number v-model:value="baseAttributes.spirit" />
          </n-form-item>
          <n-form-item label="灵力获取倍率">
            <n-input-number v-model:value="baseAttributes.spiritRate" />
          </n-form-item>
          <n-form-item label="幸运值">
            <n-input-number v-model:value="baseAttributes.luck" />
          </n-form-item>
          <n-form-item label="修炼速率">
            <n-input-number v-model:value="baseAttributes.cultivationRate" />
          </n-form-item>
          <n-form-item label="灵草获取倍率">
            <n-input-number v-model:value="baseAttributes.herbRate" />
          </n-form-item>
          <n-form-item label="炼丹成功率加成">
            <n-input-number v-model:value="baseAttributes.alchemyRate" />
          </n-form-item>
          <n-form-item label="灵石">
            <n-input-number v-model:value="baseAttributes.spiritStones" />
          </n-form-item>
          <n-form-item label="灵宠精华">
            <n-input-number v-model:value="baseAttributes.petEssence" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button type="info" @click="resetPlayerData">重置数据</n-button>
            <n-button type="primary" @click="updateAttributes">保存修改</n-button>
          </n-space>
        </template>
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
  import { usePlayerStore } from '../stores/player'
  import { ref } from 'vue'
  import { useMessage } from 'naive-ui'
  import type { PlayerState } from '../types/player'

  const playerStore = usePlayerStore()
  const message = useMessage()

  // 基础属性编辑
  const baseAttributes = ref({
    name: playerStore.name,
    level: playerStore.level,
    realm: playerStore.realm,
    cultivation: playerStore.cultivation,
    maxCultivation: playerStore.maxCultivation,
    spirit: playerStore.spirit,
    spiritRate: playerStore.spiritRate,
    luck: playerStore.luck,
    cultivationRate: playerStore.cultivationRate,
    herbRate: playerStore.herbRate,
    alchemyRate: playerStore.alchemyRate,
    spiritStones: playerStore.spiritStones,
    petEssence: playerStore.petEssence
  })

  // 更新玩家属性
  const updateAttributes = () => {
    try {
      // 更新基础属性
      Object.assign(playerStore, baseAttributes.value)
      // 保存数据
      playerStore.saveData()
      message.success('属性更新成功')
    } catch (error: unknown) {
      message.error('更新失败：' + (error instanceof Error ? error.message : String(error)))
    }
  }

  // 重置玩家数据
  const resetPlayerData = async () => {
    try {
      playerStore.$reset()
      await playerStore.initializePlayer()
      message.success('数据重置成功')
      // 刷新显示的数据
      Object.assign(
        baseAttributes.value,
        Object.fromEntries(
          Object.keys(baseAttributes.value).map(key => [key, playerStore[key as keyof PlayerState]])
        )
      )
    } catch (error: unknown) {
      message.error('重置失败：' + (error instanceof Error ? error.message : String(error)))
    }
  }
</script>

<style scoped></style>
