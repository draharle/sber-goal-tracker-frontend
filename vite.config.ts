/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// API_PROXY_TARGET — куда dev-сервер проксирует /api (тот же смысл, что у nginx в Docker).
// Переменная без префикса VITE_, поэтому в код браузера она не попадает.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:8000';

  return {
    plugins: [react()],
    build: {
      // antd — самая тяжёлая часть; выносим библиотеки в отдельные файлы, чтобы они кэшировались
      // браузером независимо от кода страницы.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            antd: ['antd', '@ant-design/icons'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
