import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Vite plugin providing the local Hybrid Data Layer API (/api/projects)
 * Persists changes directly to data/projects.json when running locally,
 * complementing browser localStorage and JSON import/export.
 */
function meiStudioHybridDataPlugin() {
  const dataFilePath = path.resolve(process.cwd(), 'data', 'projects.json');

  const ensureDataDir = () => {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };

  return {
    name: 'mei-studio-hybrid-data-api',
    configureServer(server) {
      server.middlewares.use('/api/projects', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method === 'GET') {
          try {
            if (fs.existsSync(dataFilePath)) {
              const raw = fs.readFileSync(dataFilePath, 'utf-8');
              res.statusCode = 200;
              res.end(raw);
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ initialized: false }));
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              ensureDataDir();
              fs.writeFileSync(dataFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), meiStudioHybridDataPlugin()],
  server: {
    port: 5173,
    host: true
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
