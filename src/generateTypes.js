const axios = require('axios');
const { exec } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

const apiJsonPath = path.resolve(__dirname, '../api.json');

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

module.exports = {
  fetchOpenApiSpec,
  generateTypes,
  apiJsonPath,
};
