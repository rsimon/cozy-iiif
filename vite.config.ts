import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
        'level-0/index': resolve(__dirname, 'src/level-0/index.ts'),
      },
      formats: ['es']
    },
    rollupOptions: {
      output: {
        preserveModules: true
      }
    }
  }
});