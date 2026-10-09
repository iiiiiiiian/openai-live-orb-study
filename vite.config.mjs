import {defineConfig} from 'vite';
import {cp} from 'node:fs/promises';

export default defineConfig({
  root: 'demo',
  base: './',
  publicDir: false,
  server: {host: 'localhost', port: 5173, strictPort: true},
  preview: {host: 'localhost', port: 4173, strictPort: true},
  build: {outDir: '../demo-dist', emptyOutDir: true},
  plugins: [{
    name: 'local-horizon-renderer',
    async closeBundle() {
      await cp(new URL('./demo/authorized-renderer/', import.meta.url),
        new URL('./demo-dist/authorized-renderer/', import.meta.url), {recursive: true});
    },
  }],
});
