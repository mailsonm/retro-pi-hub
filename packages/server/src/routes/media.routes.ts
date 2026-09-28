import { FastifyInstance } from 'fastify';
import path from 'node:path';
import fs from 'node:fs';
import { isValidSystem } from '@retro-pi-hub/shared';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

export interface MediaRoutesOptions {
  romsDir: string;
}

export async function mediaRoutes(app: FastifyInstance, options: MediaRoutesOptions) {
  app.get('/api/media/:system/*', async (request, reply) => {
    const { system } = request.params as { system: string };
    const wild = (request.params as any)['*'] as string;

    if (!isValidSystem(system)) {
      return reply.status(400).send({ error: 'INVALID_SYSTEM', message: `Unknown system: ${system}` });
    }

    if (!wild) {
      return reply.status(400).send({ error: 'INVALID_PATH', message: 'Missing media path' });
    }

    const systemDir = path.resolve(options.romsDir, system);
    const resolvedPath = path.resolve(systemDir, wild);

    // Path traversal protection: ensure resolved path is inside the system directory
    if (!resolvedPath.startsWith(systemDir + path.sep)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Path traversal detected' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Media not found' });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Media is not a file' });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mime = MIME_MAP[ext] || 'application/octet-stream';

    reply.header('Content-Type', mime);
    reply.header('Content-Length', stat.size);
    reply.header('Cache-Control', 'public, max-age=86400, immutable');

    const stream = fs.createReadStream(resolvedPath);
    return reply.send(stream);
  });
}
