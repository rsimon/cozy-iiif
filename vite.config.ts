import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        'index': './src/index.ts',
        'core/index': './src/core/index.ts',
        'helpers/index': './src/helpers/index.ts',
        'level-0/index': './src/level-0/index.ts',
      },
      formats: ['es']
    }
  }
});