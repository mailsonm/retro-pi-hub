import { FastifyInstance } from 'fastify';
import { RomStreamService } from '../services/rom-stream.service.js';

export interface RomRoutesOptions {
  romStreamService: RomStreamService;
}

export async function romRoutes(app: FastifyInstance, options: RomRoutesOptions) {
  app.get<{
    Params: { system: string; rom: string };
  }>('/api/roms/:system/:rom', async (request, reply) => {
    const { system, rom } = request.params;
    const rangeHeader = request.headers.range;

    const result = await options.romStreamService.resolveRomStream(system, rom, rangeHeader);

    for (const [key, value] of Object.entries(result.headers)) {
      reply.header(key, value);
    }

    if (result.stream) {
      return reply.status(result.statusCode).send(result.stream);
    }

    return reply.status(result.statusCode).send();
  });
}
