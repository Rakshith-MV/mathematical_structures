import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const DATA_FILES = ['contexts', 'properties', 'statements', 'counterexamples'] as const;

/**
 * Dev-only endpoint used by the in-app Editor to write edited domains back to
 * data/<domain>/*.json, so UI-authored definitions and theorems can be committed.
 */
function dataWriter(): Plugin {
  return {
    name: 'theorem-graph-data-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__api/save-domain', (req, res) => {
        const reply = (status: number, body: object) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return reply(405, { error: 'POST only' });

        let raw = '';
        req.on('data', chunk => (raw += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (typeof data.domain !== 'string' || !/^[a-z0-9_-]+$/.test(data.domain)) {
              return reply(400, { error: 'Invalid domain name' });
            }
            for (const f of DATA_FILES) {
              if (!Array.isArray(data[f])) return reply(400, { error: `Missing array "${f}"` });
            }
            const dir = path.resolve(__dirname, 'data', data.domain);
            fs.mkdirSync(dir, { recursive: true });
            for (const f of DATA_FILES) {
              fs.writeFileSync(path.join(dir, `${f}.json`), JSON.stringify(data[f], null, 2) + '\n');
            }
            reply(200, { message: `Wrote data/${data.domain}/*.json` });
          } catch (e) {
            reply(500, { error: String(e) });
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dataWriter()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '/data': path.resolve(__dirname, './data')
    }
  },
  server: {
    fs: {
      allow: ['.', 'data']
    }
  }
});
