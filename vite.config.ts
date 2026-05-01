import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Fix for "431 Request Header Fields Too Large" error
        hmr: {
          clientPort: 3000,
        },
        // Increase header size limit to handle large cookies/localStorage
        maxHeaderSize: 16384, // 16KB (default is 8KB)
        watch: {
          ignored: ['**/data/db.json', '**/data/**/*.json'],
        },
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || ""),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
        'process.env.GEMINI_API_KEY_1': JSON.stringify(env.GEMINI_API_KEY_1 || ""),
        'process.env.GEMINI_API_KEY_2': JSON.stringify(env.GEMINI_API_KEY_2 || ""),
        'process.env.GEMINI_API_KEY_3': JSON.stringify(env.GEMINI_API_KEY_3 || ""),
        'process.env.GEMINI_API_KEY_4': JSON.stringify(env.GEMINI_API_KEY_4 || ""),
        'process.env.GEMINI_API_KEY_5': JSON.stringify(env.GEMINI_API_KEY_5 || ""),
        'process.env.GEMINI_API_KEY_6': JSON.stringify(env.GEMINI_API_KEY_6 || ""),
        'process.env.GEMINI_API_KEY_7': JSON.stringify(env.GEMINI_API_KEY_7 || ""),
        'process.env.GEMINI_API_KEY_8': JSON.stringify(env.GEMINI_API_KEY_8 || ""),
        'process.env.GEMINI_API_KEY_9': JSON.stringify(env.GEMINI_API_KEY_9 || ""),
        'process.env.GEMINI_API_KEY_10': JSON.stringify(env.GEMINI_API_KEY_10 || ""),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || ""),
        'process.env.OPENROUTER_API_KEY_2': JSON.stringify(env.OPENROUTER_API_KEY_2 || ""),
        'process.env.OPENROUTER_API_KEY_3': JSON.stringify(env.OPENROUTER_API_KEY_3 || ""),
        'process.env.OPENROUTER_API_KEY_4': JSON.stringify(env.OPENROUTER_API_KEY_4 || ""),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Force Vite to use the browser/web build of @google/genai
          '@google/genai': path.resolve(__dirname, 'node_modules/@google/genai/dist/web/index.mjs'),
        }
      },
      optimizeDeps: {
        include: ['@google/genai'],
        esbuildOptions: {
          target: 'es2022',
        }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          external: [],
          output: {
            manualChunks(id) {
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('pdfjs-dist'))    return 'pdfjs';
              if (id.includes('marked'))        return 'marked';
              if (id.includes('node_modules'))  return 'vendor';
              if (id.includes('components/icons.tsx')) return 'icons';
              if (id.includes('data/'))         return 'data-assets';
            }
          }
        }
      }
    };
});
