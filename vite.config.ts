import { defineConfig } from 'vite';

export default defineConfig({
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