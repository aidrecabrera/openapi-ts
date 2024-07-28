#!/usr/bin/env node
import axios from 'axios';
import { exec } from 'child_process';
import express from 'express';
import { promises as fs } from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import winston from 'winston';
import { z } from 'zod';

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
});

const configFilePath = 'ts-openapi.config.json';
let configData;

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

const config = configSchema.parse(configData);

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

const app = express();

app.get('/types', (req, res) => {
  res.sendFile(config.OUTPUT_FILE_PATH, { root: process.cwd() }, (err) => {
    if (err) {
      logger.error(`Error sending file: ${err.message}`);
      res.status(500).send('Error retrieving types file');
    }
  });
});

async function updateTypes() {
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

function gracefulShutdown(signal) {
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

const commands = process.argv.slice(2);

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

  const configJson = {
    PORT: port.port,
    NODE_ENV: nodeEnv.nodeEnv,
    LOG_LEVEL: logLevel.logLevel,
    OPENAPI_SPEC_URL: openapiSpecUrl.openapiSpecUrl,
    OUTPUT_FILE_PATH: outputFilePath.outputFilePath,
  };

  await fs.writeFile(configFilePath, JSON.stringify(configJson, null, 2));
  console.log('Configuration file created:', configFilePath);
}

async function main() {
  if (commands[0] === 'init') {
    await initConfig();
  } else {
    try {
      const spec = await fetchOpenApiSpec();
      await generateTypes(spec);
      logger.info('Types generated successfully');
    } catch (error) {
      logger.error('Error generating types:', error);
    }
  }
}

main();
