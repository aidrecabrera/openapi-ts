import * as fs from 'fs';
import { z } from 'zod';

const ConfigSchema = z.object({
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

export type Config = z.infer<typeof ConfigSchema>;

function validateConfig(config: Record<string, unknown>): Config {
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid configuration:', error.errors);
    } else {
      console.error('Unexpected error during config validation:', error);
    }
    process.exit(1);
  }
}

let configData;
try {
  const configFile = fs.readFileSync('ts-openapi.config.json', 'utf-8');
  configData = JSON.parse(configFile);
} catch (error) {
  console.error('Error reading configuration file:', error);
  process.exit(1);
}

const config: Config = validateConfig(configData);

export default config;
