import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  return {
    plugins: [react()],
    server: {
      port: Number(env.CLIENT_PORT || 5173),
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_BASE_URL || 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'http-vendor': ['axios'],
            icons: ['lucide-react'],
            'motion-vendor': ['motion'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});
