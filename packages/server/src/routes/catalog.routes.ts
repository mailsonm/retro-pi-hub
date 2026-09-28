import { FastifyInstance } from 'fastify';
import { CatalogService } from '../services/catalog.service.js';

export interface CatalogRoutesOptions {
  catalogService: CatalogService;
}

export async function catalogRoutes(app: FastifyInstance, options: CatalogRoutesOptions) {
  app.get('/api/catalog', async (_request, reply) => {
    const catalog = await options.catalogService.getCatalog();
    return reply.status(200).send(catalog);
  });
}
