#!/usr/bin/env node

const fs = require('fs');
const { fetchOpenApiSpec, generateTypes } = require('./generateTypes');
const logger = require('./logger');

const commands = process.argv.slice(2);

async function initConfig() {
  const inquirer = require('inquirer');

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

  fs.writeFileSync(
    'ts-openapi.config.json',
    JSON.stringify(configJson, null, 2),
  );
  console.log('Configuration file created: ts-openapi.config.json');
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
