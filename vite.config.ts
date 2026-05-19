import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  if (mode === 'library') {
    return {
      build: {
        cssCodeSplit: false,
        emptyOutDir: true,
        lib: {
          entry: resolve(rootDir, 'src/index.ts'),
          fileName: 'fluid-cursor',
          formats: ['es'],
          name: 'FluidCursor',
        },
        outDir: 'dist',
        rollupOptions: {
          output: {
            assetFileNames: (assetInfo) => {
              if (assetInfo.names.includes('style.css')) {
                return 'fluid-cursor.css'
              }

              return 'assets/[name]-[hash][extname]'
            },
          },
        },
      },
    }
  }

  return {
    build: {
      emptyOutDir: false,
      outDir: 'dist',
    },
  }
})