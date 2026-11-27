import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { usePlayerStore } from '../stores/player'
import Home from '../views/Home.vue'
import Character from '../views/Character.vue'
import Inventory from '../views/Inventory.vue'
import Exploration from '../views/Exploration.vue'
import Achievements from '../views/Achievements.vue'
import Settings from '../views/Settings.vue'
import GM from '../views/GM.vue'
import Alchemy from '../views/Alchemy.vue'
import Dungeon from '../views/Dungeon.vue'
import Gacha from '../views/Gacha.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/cultivation',
    name: 'Cultivation',
    redirect: '/character'
  },
  {
    path: '/character',
    name: 'Character',
    component: Character
  },
  {
    path: '/forge',
    name: 'Forge',
    component: Inventory,
    props: { section: 'forge' }
  },
  {
    path: '/equipment',
    alias: '/inventory/loose',
    name: 'Equipment',
    component: Inventory,
    props: { section: 'bag', kind: 'loose' }
  },
  {
    path: '/pets',
    alias: '/inventory/pets',
    name: 'Pets',
    component: Inventory,
    props: { section: 'bag', kind: 'pets' }
  },
  {
    path: '/inventory',
    redirect: '/alchemy?tab=herbs'
  },
  {
    path: '/inventory/:kind(herbs|pills|formulas)',
    redirect: route => route.params.kind === 'pills' ? '/alchemy' : { path: '/alchemy', query: { tab: String(route.params.kind) } }
  },
  {
    path: '/exploration',
    name: 'Exploration',
    component: Exploration
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: Achievements
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/gm',
    name: 'gm',
    component: GM,
    beforeEnter: (to, from, next) => {
      const playerStore = usePlayerStore()
      if (!playerStore.isGMMode) {
        next('/cultivation')
      } else {
        next()
      }
    }
  },
  {
    path: '/alchemy',
    name: 'alchemy',
    component: Alchemy
  },
  {
    path: '/dungeon',
    name: 'Dungeon',
    component: Dungeon
  },
  {
    path: '/gacha',
    name: 'Gacha',
    component: Gacha
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
