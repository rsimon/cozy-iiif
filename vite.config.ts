import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: {
        'index': './src/index.ts',
        'helpers/index': './src/helpers/index.ts',
        'level-0/index': './src/level-0/index.ts',
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['image-size']
    }
  }
});