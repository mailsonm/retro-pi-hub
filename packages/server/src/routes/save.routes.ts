import { FastifyInstance } from 'fastify';
import { TvLockService } from '../services/tv-lock.service.js';
import { SaveSyncService } from '../services/save-sync.service.js';
import { SaveSyncRequestDTO } from '@retro-pi-hub/shared';

export interface SaveRoutesOptions {
  tvLockService: TvLockService;
  saveSyncService?: SaveSyncService;
}

export async function saveRoutes(app: FastifyInstance, options: SaveRoutesOptions) {
  // Lock status check
  app.get<{
    Params: { system: string; rom: string };
  }>('/api/saves/:system/:rom/lock-status', async (request, reply) => {
    const { system, rom } = request.params;
    const status = await options.tvLockService.getLockStatus(system, rom);
    return reply.status(200).send(status);
  });

  // Save sync
  app.post<{
    Params: { system: string; rom: string };
    Body: SaveSyncRequestDTO;
  }>('/api/saves/:system/:rom/sync', async (request, reply) => {
    if (!options.saveSyncService) {
      return reply.status(500).send({ error: 'SaveSyncService not initialized' });
    }

    const { system, rom } = request.params;
    const result = await options.saveSyncService.syncSave(
      system,
      rom,
      request.body,
      options.tvLockService
    );

    return reply.status(result.statusCode).send(result.body);
  });

  // Slots listing
  app.get<{
    Params: { system: string; rom: string };
  }>('/api/saves/:system/:rom/slots', async (request, reply) => {
    if (!options.saveSyncService) {
      return reply.status(500).send({ error: 'SaveSyncService not initialized' });
    }

    const { system, rom } = request.params;
    const slots = await options.saveSyncService.getSlots(system, rom);
    return reply.status(200).send(slots);
  });
}
