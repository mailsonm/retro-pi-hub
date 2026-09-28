import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Default paths for Raspberry Pi / RetroPie
const HOME = os.homedir();
const ROMS_DIR = process.env.ROMS_DIR || path.join(HOME, 'RetroPie', 'roms');
const SAVES_DIR = process.env.SAVES_DIR || ROMS_DIR;
const TV_LOCK_FILE = process.env.TV_LOCK_FILE || '/dev/shm/retroarch_active.json';
const EMULATORJS_DIR = process.env.EMULATORJS_DIR || path.resolve(__dirname, '../../public/emulatorjs');
const CLIENT_DIST_DIR = process.env.CLIENT_DIST_DIR || path.resolve(__dirname, '../../client/dist');

async function main() {
  const app = buildApp({
    romsDir: ROMS_DIR,
    savesDir: SAVES_DIR,
    tvLockFilePath: TV_LOCK_FILE,
    emulatorJsDir: EMULATORJS_DIR,
    clientDistDir: CLIENT_DIST_DIR
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    const interfaces = os.networkInterfaces();
    const localIps: string[] = [];

    for (const netInterface of Object.values(interfaces)) {
      if (!netInterface) continue;
      for (const iface of netInterface) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIps.push(iface.address);
        }
      }
    }

    console.log('='.repeat(55));
    console.log('🎮  RETRO-PI HUB DAEMON STARTED  🎮');
    console.log('='.repeat(55));
    console.log(`📡 Local Port:    http://localhost:${PORT}`);
    for (const ip of localIps) {
      console.log(`📱 Mobile Access: http://${ip}:${PORT}`);
    }
    console.log(`📁 ROMs Folder:   ${ROMS_DIR}`);
    console.log(`💾 Saves Folder:  ${SAVES_DIR}`);
    console.log(`🔒 TV Lock File:  ${TV_LOCK_FILE}`);
    console.log('='.repeat(55));
    console.log('Ready for web players and TV sessions.\n');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Fatal error starting Retro-Pi Hub:', err);
    process.exit(1);
  }
}

main();
