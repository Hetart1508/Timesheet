import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  return {
    plugins: [react()],
    server: {
      port: Number(env.CLIENT_PORT || 5173),
      proxy: {
        '/api': {
          target: env.API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});
