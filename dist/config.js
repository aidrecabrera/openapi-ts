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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const zod_1 = require("zod");
const ConfigSchema = zod_1.z.object({
    PORT: zod_1.z.number().int().positive(),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']),
    LOG_LEVEL: zod_1.z.enum([
        'error',
        'warn',
        'info',
        'http',
        'verbose',
        'debug',
        'silly',
    ]),
    OPENAPI_SPEC_URL: zod_1.z.string().url(),
    OUTPUT_FILE_PATH: zod_1.z.string(),
});
function validateConfig(config) {
    try {
        return ConfigSchema.parse(config);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('Invalid configuration:', error.errors);
        }
        else {
            console.error('Unexpected error during config validation:', error);
        }
        process.exit(1);
    }
}
let configData;
const configFilePath = 'ts-openapi.config.json';
if (fs.existsSync(configFilePath)) {
    try {
        const configFile = fs.readFileSync(configFilePath, 'utf-8');
        configData = JSON.parse(configFile);
    }
    catch (error) {
        console.error('Error reading configuration file:', error);
        process.exit(1);
    }
}
else {
    console.warn(`Configuration file ${configFilePath} not found. Please run 'init' command to create it.`);
    process.exit(1);
}
const config = validateConfig(configData);
exports.default = config;
