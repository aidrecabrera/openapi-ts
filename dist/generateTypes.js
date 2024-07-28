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
exports.apiJsonPath = exports.generateTypes = exports.fetchOpenApiSpec = void 0;
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./logger"));
const apiJsonPath = path.resolve(__dirname, '../api.json');
exports.apiJsonPath = apiJsonPath;
async function fetchOpenApiSpec() {
    try {
        const response = await axios_1.default.get(config_1.default.OPENAPI_SPEC_URL);
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            logger_1.default.error(`Error fetching OpenAPI spec: ${error.message}`);
            if (error.response) {
                logger_1.default.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            }
        }
        else {
            logger_1.default.error('Unexpected error fetching OpenAPI spec:', error);
        }
        throw error;
    }
}
exports.fetchOpenApiSpec = fetchOpenApiSpec;
async function generateTypes(openApiSpec) {
    try {
        const openApiSpecJson = JSON.stringify(openApiSpec, null, 2);
        await fs_1.promises.writeFile(apiJsonPath, openApiSpecJson);
        await new Promise((resolve, reject) => {
            (0, child_process_1.exec)(`npx openapi-typescript ${apiJsonPath} --output ${config_1.default.OUTPUT_FILE_PATH}`, (error, stdout, stderr) => {
                if (error) {
                    logger_1.default.error(`Error generating types: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    logger_1.default.warn(`Warning during type generation: ${stderr}`);
                }
                logger_1.default.info('Successfully generated TypeScript types.');
                logger_1.default.debug(`Type generation output: ${stdout}`);
                resolve();
            });
        });
        await fs_1.promises.unlink(apiJsonPath);
    }
    catch (error) {
        logger_1.default.error('Error generating types:', error);
        throw error;
    }
}
exports.generateTypes = generateTypes;
