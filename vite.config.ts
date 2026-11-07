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
      // Библиотеки (React, antd) — отдельным файлом vendor: он кэшируется браузером независимо
      // от кода страницы. antd весит ~1 МБ без сжатия (~310 КБ gzip), поэтому порог предупреждения поднят.
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
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
