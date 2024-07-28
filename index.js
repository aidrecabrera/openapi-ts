#!/usr/bin/env node
import axios from 'axios';
import { exec } from 'child_process';
import { watch } from 'chokidar';
import express from 'express';
import { promises as fs } from 'fs';
import { createServer } from 'http';
import inquirer from 'inquirer';
import path from 'path';
import winston from 'winston';
import { z } from 'zod';

// TODO: Generate type.util.ts automatically for easy access

const configSchema = z.object({
  PORT: z.number().int().positive(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  LOG_LEVEL: z.enum([
    'error',
    'warn',
    'info',
    'http',
    'verbose',
    'debug',
    'silly',
  ]),
  OPENAPI_SPEC_URL: z.string().url(),
  OUTPUT_FILE_PATH: z.string(),
  UPDATE_INTERVAL: z.number().int().positive().optional(),
  WATCH_DIR: z.string().optional(),
});

const configFilePath = 'ts-openapi.config.json';
let configData;

const commands = process.argv.slice(2);

/**
 * Initializes the configuration file with user inputs.
 * Prompts the user for necessary configuration values and writes them to a file.
 */
async function initConfig() {
  const port = await inquirer.prompt({
    type: 'input',
    name: 'port',
    message: 'Enter the port number:',
    default: '3000',
    filter(port) {
      return Number(port);
    },
  });

  const nodeEnv = await inquirer.prompt({
    type: 'list',
    name: 'nodeEnv',
    message: 'Select the environment:',
    choices: [
      { name: 'development', value: 'development' },
      { name: 'production', value: 'production' },
      { name: 'test', value: 'test' },
    ],
    default: 'development',
    filter: (val) => val.toLowerCase(),
  });

  const logLevel = await inquirer.prompt({
    type: 'list',
    name: 'logLevel',
    message: 'Select the log level:',
    choices: [
      { name: 'error', value: 'error' },
      { name: 'warn', value: 'warn' },
      { name: 'info', value: 'info' },
      { name: 'http', value: 'http' },
      { name: 'verbose', value: 'verbose' },
      { name: 'debug', value: 'debug' },
      { name: 'silly', value: 'silly' },
    ],
    default: 'info',
    filter: (val) => val.toLowerCase(),
  });

  const openapiSpecUrl = await inquirer.prompt({
    type: 'input',
    name: 'openapiSpecUrl',
    message: 'Enter the OpenAPI spec URL:',
    default: 'http://localhost:3000/api-json',
    validate: (val) => {
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch (e) {
        return 'Please enter a valid URL.';
      }
    },
  });

  const outputFilePath = await inquirer.prompt({
    type: 'input',
    name: 'outputFilePath',
    message: 'Enter the output file path for TypeScript types:',
    default: './src/types.ts',
    validate: (val) => {
      return val.endsWith('.ts') ? true : 'Please enter a valid .ts file path.';
    },
  });

  const updateInterval = await inquirer.prompt({
    type: 'input',
    name: 'updateInterval',
    message: 'Enter the interval for updating types (in milliseconds):',
    default: '3600000',
    validate: (val) => {
      return Number.isInteger(Number(val)) && Number(val) > 0
        ? true
        : 'Please enter a valid positive integer.';
    },
  });

  const watchDir = await inquirer.prompt({
    type: 'input',
    name: 'watchDir',
    message: 'Enter the directory to watch for changes (optional):',
    default: '.',
  });

  const configJson = {
    PORT: port.port,
    NODE_ENV: nodeEnv.nodeEnv,
    LOG_LEVEL: logLevel.logLevel,
    OPENAPI_SPEC_URL: openapiSpecUrl.openapiSpecUrl,
    OUTPUT_FILE_PATH: outputFilePath.outputFilePath,
    UPDATE_INTERVAL: Number(updateInterval.updateInterval),
    WATCH_DIR: watchDir.watchDir,
  };

  await fs.writeFile(configFilePath, JSON.stringify(configJson, null, 2));
  console.log('Configuration file created:', configFilePath);
}

if (commands[0] === 'init') {
  await initConfig();
  process.exit(0);
}

// Check if configuration file exists, else prompt user to run 'init'
if (
  await fs
    .stat(configFilePath)
    .then(() => true)
    .catch(() => false)
) {
  try {
    const configFile = await fs.readFile(configFilePath, 'utf-8');
    configData = JSON.parse(configFile);
  } catch (error) {
    console.error('Error reading configuration file:', error);
    process.exit(1);
  }
} else {
  console.warn(
    `Configuration file ${configFilePath} not found. Please run 'init' command to create it.`,
  );
  process.exit(1);
}

// Validate and parse configuration data using Zod
const config = configSchema.parse(configData);

// Initialize logger using Winston with specified log level and format
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

const apiJsonPath = path.resolve(process.cwd(), 'api.json');

/**
 * Fetches the OpenAPI specification from the specified URL.
 * @returns {Promise<Object>} The OpenAPI specification as a JSON object.
 * @throws Will throw an error if the OpenAPI specification cannot be fetched.
 */
async function fetchOpenApiSpec() {
  try {
    const response = await axios.get(config.OPENAPI_SPEC_URL);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(`Error fetching OpenAPI spec: ${error.message}`);
      if (error.response) {
        logger.error(
          `Status: ${error.response.status}, Data: ${JSON.stringify(
            error.response.data,
          )}`,
        );
      }
    } else {
      logger.error('Unexpected error fetching OpenAPI spec:', error);
    }
    throw error;
  }
}

/**
 * Generates TypeScript types from the given OpenAPI specification.
 * @param {Object} openApiSpec The OpenAPI specification as a JSON object.
 * @returns {Promise<void>} A promise that resolves when the types have been generated.
 * @throws Will throw an error if the types cannot be generated.
 */
async function generateTypes(openApiSpec) {
  try {
    const openApiSpecJson = JSON.stringify(openApiSpec, null, 2);
    await fs.writeFile(apiJsonPath, openApiSpecJson);

    await new Promise((resolve, reject) => {
      exec(
        `npx openapi-typescript ${apiJsonPath} --output ${config.OUTPUT_FILE_PATH}`,
        (error, stdout, stderr) => {
          if (error) {
            logger.error(`Error generating types: ${error.message}`);
            reject(error);
            return;
          }
          if (stderr) {
            logger.warn(`Warning during type generation: ${stderr}`);
          }
          logger.info('Successfully generated TypeScript types.');
          logger.debug(`Type generation output: ${stdout}`);
          resolve();
        },
      );
    });

    await fs.unlink(apiJsonPath);
  } catch (error) {
    logger.error('Error generating types:', error);
    throw error;
  }
}

// Serve the generated TypeScript types
const app = express();

app.get('/types', (req, res) => {
  res.sendFile(config.OUTPUT_FILE_PATH, { root: process.cwd() }, (err) => {
    if (err) {
      logger.error(`Error sending file: ${err.message}`);
      res.status(500).send('Error retrieving types file');
    }
  });
});

/**
 * Updates the TypeScript types by fetching the latest OpenAPI specification and regenerating the types.
 * @returns {Promise<void>} A promise that resolves when the types have been updated.
 */
async function updateTypes() {
  try {
    const spec = await fetchOpenApiSpec();
    await generateTypes(spec);
    logger.info('Types updated successfully');
  } catch (error) {
    logger.error('Error updating types:', error);
  }
}

/**
 * Starts the Express server on the specified port.
 * @param {number} port The port number to start the server on.
 * @returns {Promise<http.Server>} A promise that resolves with the server instance.
 */
async function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = createServer(app);

    server
      .listen(port)
      .on('listening', () => {
        logger.info(
          `TypeScript types server running at http://localhost:${port} in ${config.NODE_ENV} mode`,
        );
        resolve(server);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is in use, trying another port...`);
          startServer(port + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Main function to initialize and start the server, handle updates, and setup watchers.
 * Handles various signals and exceptions for graceful shutdown and error handling.
 */
async function main() {
  if (commands[0] === 'init') {
    await initConfig();
  } else if (commands[0] === 'generate') {
    try {
      await updateTypes();
    } catch (error) {
      logger.error('Error generating types:', error);
      process.exit(1);
    }
  } else {
    try {
      const server = await startServer(config.PORT);
      await updateTypes();

      if (config.UPDATE_INTERVAL) {
        setInterval(updateTypes, config.UPDATE_INTERVAL);
      } else {
        const watchDir = config.WATCH_DIR || '.';
        const watcher = watch(watchDir, {
          ignored: /(^|[\/\\])\../,
          persistent: true,
        });

        watcher.on('change', (path) => {
          logger.info(`File ${path} changed, updating types...`);
          updateTypes();
        });
      }

      process.on('SIGINT', () => {
        logger.info('Received SIGINT signal, shutting down...');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM signal, shutting down...');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });

      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
      });
    } catch (error) {
      logger.error('Error starting server:', error);
      process.exit(1);
    }
  }
}

main();
