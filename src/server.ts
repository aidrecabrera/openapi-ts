import express from 'express';
import config from './config';
import { fetchOpenApiSpec, generateTypes } from './generateTypes';
import logger from './logger';

const app = express();

app.get('/types', (req, res) => {
  res.sendFile(config.OUTPUT_FILE_PATH, { root: process.cwd() }, (err) => {
    if (err) {
      logger.error(`Error sending file: ${err.message}`);
      res.status(500).send('Error retrieving types file');
    }
  });
});

async function updateTypes(): Promise<void> {
  try {
    const spec = await fetchOpenApiSpec();
    await generateTypes(spec);
    logger.info('Types updated successfully');
  } catch (error) {
    logger.error('Error updating types:', error);
  }
}

const server = app.listen(config.PORT, () => {
  logger.info(
    `TypeScript types server running at http://localhost:${config.PORT} in ${config.NODE_ENV} mode`,
  );

  updateTypes();
});

function gracefulShutdown(signal: string) {
  return () => {
    logger.info(`Received ${signal} signal, shutting down...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };
}

process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

setInterval(updateTypes, 60 * 60 * 1000);
