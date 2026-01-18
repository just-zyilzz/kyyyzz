import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server', // Enable SSR
  adapter: vercel(),
  vite: {
    server: {
      hmr: {
        clientPort: 4321
      }
    },
    ssr: {
      noExternal: ['sqlite3', 'fluent-ffmpeg']
    }
  }
});
