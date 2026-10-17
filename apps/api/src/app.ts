/**
 * Fastify Application Factory for ElevateWeb Content Engine.
 * Provides buildApp() with clean dependency injection for OpenAI and Supabase clients.
 */

import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { errorHandler } from './plugins/errorHandler.ts';
import { healthRoutes } from './routes/health.ts';
import { contentRoutes } from './routes/content.ts';

declare module 'fastify' {
  interface FastifyInstance {
    openaiClient?: OpenAI | unknown;
    supabaseClient?: SupabaseClient | unknown;
  }
}

export interface BuildAppOptions {
  openaiClient?: OpenAI | unknown;
  supabaseClient?: SupabaseClient | unknown;
  logger?: boolean | FastifyServerOptions['logger'];
  serverOptions?: Omit<FastifyServerOptions, 'logger'>;
}

/**
 * Builds and initializes the Fastify application with configured routes, plugins, and DI.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? false,
    ...options.serverOptions,
  });

  // 1. Dependency Injection: Decorate Fastify instance
  app.decorate('openaiClient', options.openaiClient ?? null);
  app.decorate('supabaseClient', options.supabaseClient ?? null);

  // 2. Error & Not Found Handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // 3. Register Route Plugins
  await app.register(healthRoutes);
  await app.register(contentRoutes, {
    prefix: '/api/content',
    openaiClient: options.openaiClient,
    supabaseClient: options.supabaseClient,
  });

  // 4. Ensure all plugins and hooks are loaded
  await app.ready();

  return app;
}
