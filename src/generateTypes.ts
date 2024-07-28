import axios from 'axios';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import config from './config';
import logger from './logger';

const apiJsonPath = path.resolve(__dirname, '../api.json');

export async function fetchOpenApiSpec(): Promise<object> {
  try {
    const response = await axios.get<object>(config.OPENAPI_SPEC_URL);
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

export async function generateTypes(openApiSpec: object): Promise<void> {
  try {
    const openApiSpecJson = JSON.stringify(openApiSpec, null, 2);
    await fs.writeFile(apiJsonPath, openApiSpecJson);

    await new Promise<void>((resolve, reject) => {
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

export { apiJsonPath };
