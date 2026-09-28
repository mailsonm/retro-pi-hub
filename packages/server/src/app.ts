import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { CatalogService } from './services/catalog.service.js';
import { catalogRoutes } from './routes/catalog.routes.js';
import { RomStreamService } from './services/rom-stream.service.js';
import { romRoutes } from './routes/rom.routes.js';
import { TvLockService } from './services/tv-lock.service.js';
import { SaveSyncService } from './services/save-sync.service.js';
import { saveRoutes } from './routes/save.routes.js';
import { NetplaySignalingManager } from './signaling/netplay-signaling.js';

export interface AppOptions {
  romsDir: string;
  savesDir?: string;
  emulatorJsDir?: string;
  clientDistDir?: string;
  tvLockFilePath?: string;
}

export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: false
  });

  app.register(cors, {
    origin: true
  });

  if (options.emulatorJsDir) {
    app.register(fastifyStatic, {
      root: options.emulatorJsDir,
      prefix: '/emulatorjs/',
      setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (filePath.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      }
    });
  }

  if (options.clientDistDir) {
    app.register(fastifyStatic, {
      root: options.clientDistDir,
      prefix: '/',
      decorateReply: false
    });
  }

  app.register(websocket);

  // Services
  const catalogService = new CatalogService({
    romsDir: options.romsDir,
    savesDir: options.savesDir
  });

  const romStreamService = new RomStreamService(options.romsDir);

  const tvLockService = new TvLockService({
    lockFilePath: options.tvLockFilePath
  });

  const saveSyncService = new SaveSyncService(options.savesDir || options.romsDir);

  const signalingManager = new NetplaySignalingManager();

  // Routes
  app.register(catalogRoutes, { catalogService });
  app.register(romRoutes, { romStreamService });
  app.register(saveRoutes, { tvLockService, saveSyncService });

  app.register(async (instance) => {
    instance.get('/ws/netplay', { websocket: true }, (socket) => {
      signalingManager.handleConnection(socket);
    });
  });

  return app;
}
