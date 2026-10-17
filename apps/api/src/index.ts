/**
 * Server Entrypoint for ElevateWeb Content Engine API.
 * Loads environment variables, instantiates buildApp(), binds to PORT and HOST,
 * and attaches graceful shutdown handlers for SIGINT and SIGTERM.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.ts';

// 1. Environment Loading
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = process.env.HOST || '0.0.0.0';
const logLevel = process.env.LOG_LEVEL || 'info';

async function main(): Promise<void> {
  const app = await buildApp({
    logger: {
      level: logLevel,
    },
  });

  // 2. Graceful Shutdown Handlers
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    app.log.info(`Received ${signal}. Shutting down HTTP server gracefully...`);

    try {
      await app.close();
      app.log.info('Fastify HTTP server closed successfully.');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during graceful shutdown.');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'Unhandled Promise Rejection caught at process level.');
  });

  process.on('uncaughtException', (err) => {
    app.log.fatal({ err }, 'Uncaught Exception caught at process level.');
    process.exit(1);
  });

  // 3. Start Listening
  try {
    const address = await app.listen({ port, host });
    app.log.info(`Elevate Content Engine API server listening on ${address}`);
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start Fastify server.');
    process.exit(1);
  }
}

void main();
