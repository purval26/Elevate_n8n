/**
 * Health Check Route Plugin for ElevateWeb Content Engine.
 * GET /health -> HTTP 200 { status: 'ok', service: 'elevate-content-engine-api' }
 */

import type { FastifyPluginAsync } from 'fastify';

export interface HealthResponse {
  status: 'ok';
  service: 'elevate-content-engine-api';
}

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    const payload: HealthResponse = {
      status: 'ok',
      service: 'elevate-content-engine-api',
    };

    return reply.status(200).send(payload);
  });
};
