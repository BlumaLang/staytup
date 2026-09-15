import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function staytupAutoUpdatePlugin() {
  const buildTime = Date.now();
  const buildId = 'build_' + buildTime;
  const version = '1.0.0';

  return {
    name: 'staytup-auto-update-plugin',
    config() {
      return {
        define: {
          __APP_BUILD_INFO__: JSON.stringify({
            version,
            buildId,
            buildTime,
            builtAt: new Date(buildTime).toISOString(),
          }),
        },
      };
    },
    buildStart() {
      const payload = JSON.stringify(
        {
          version,
          buildId,
          buildTime,
          builtAt: new Date(buildTime).toISOString(),
        },
        null,
        2
      );
      try {
        fs.writeFileSync(path.resolve(__dirname, 'public/version.json'), payload);
      } catch (err) {
        console.warn('Could not write public/version.json:', err);
      }
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (fs.existsSync(distDir)) {
        const payload = JSON.stringify(
          {
            version,
            buildId,
            buildTime,
            builtAt: new Date(buildTime).toISOString(),
          },
          null,
          2
        );
        fs.writeFileSync(path.resolve(distDir, 'version.json'), payload);

        const distSwPath = path.resolve(distDir, 'sw.js');
        if (fs.existsSync(distSwPath)) {
          let swContent = fs.readFileSync(distSwPath, 'utf-8');
          swContent = swContent.replace(/__BUILD_ID__/g, buildId);
          swContent = swContent.replace(/__BUILD_TIME__/g, String(buildTime));
          fs.writeFileSync(distSwPath, swContent);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), staytupAutoUpdatePlugin()],
  base: '/',
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
    allowedHosts: true,
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost/staytup',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
