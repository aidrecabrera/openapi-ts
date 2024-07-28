#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const generateTypes_1 = require("./generateTypes");
const logger_1 = __importDefault(require("./logger"));
const commands = process.argv.slice(2);
async function initConfig() {
    const port = await inquirer_1.default.prompt({
        type: 'input',
        name: 'port',
        message: 'Enter the port number:',
        default: '3000',
        filter(port) {
            return Number(port);
        },
    });
    const nodeEnv = await inquirer_1.default.prompt({
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
    const logLevel = await inquirer_1.default.prompt({
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
    const openapiSpecUrl = await inquirer_1.default.prompt({
        type: 'input',
        name: 'openapiSpecUrl',
        message: 'Enter the OpenAPI spec URL:',
        default: 'http://localhost:3000/api-json',
        validate: (val) => {
            try {
                const url = new URL(val);
                return url.protocol === 'http:' || url.protocol === 'https:';
            }
            catch (e) {
                return 'Please enter a valid URL.';
            }
        },
    });
    const outputFilePath = await inquirer_1.default.prompt({
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
    fs.writeFileSync('ts-openapi.config.json', JSON.stringify(configJson, null, 2));
    console.log('Configuration file created: ts-openapi.config.json');
}
async function main() {
    if (commands[0] === 'init') {
        await initConfig();
    }
    else {
        try {
            const spec = await (0, generateTypes_1.fetchOpenApiSpec)();
            await (0, generateTypes_1.generateTypes)(spec);
            logger_1.default.info('Types generated successfully');
        }
        catch (error) {
            logger_1.default.error('Error generating types:', error);
        }
    }
}
main();
