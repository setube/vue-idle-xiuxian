import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator'

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200
  },
  plugins: [
    vue(),
    AutoImport({
      dts: 'src/auto-imports.d.ts',
      imports: [
        'vue',
        { 'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'] }
      ]
    }),
    Components({ dts: 'src/components.d.ts', resolvers: [NaiveUiResolver()] }),
    vitePluginBundleObfuscator({
      enable: true,
      log: false,
      autoExcludeNodeModules: true,
      options: {
        compact: true,
        stringArray: true,
        renameGlobals: false,
        selfDefending: false,
        debugProtection: false,
        deadCodeInjection: false,
        disableConsoleOutput: false,
        stringArrayThreshold: 0.75,
        controlFlowFlattening: false,
        identifierNamesGenerator: 'hexadecimal'
      }
    })
  ],
  worker: { format: 'es' }
})
