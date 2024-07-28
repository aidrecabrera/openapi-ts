"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("./config"));
const generateTypes_1 = require("./generateTypes");
const logger_1 = __importDefault(require("./logger"));
const app = (0, express_1.default)();
app.get('/types', (req, res) => {
    res.sendFile(config_1.default.OUTPUT_FILE_PATH, { root: process.cwd() }, (err) => {
        if (err) {
            logger_1.default.error(`Error sending file: ${err.message}`);
            res.status(500).send('Error retrieving types file');
        }
    });
});
async function updateTypes() {
    try {
        const spec = await (0, generateTypes_1.fetchOpenApiSpec)();
        await (0, generateTypes_1.generateTypes)(spec);
        logger_1.default.info('Types updated successfully');
    }
    catch (error) {
        logger_1.default.error('Error updating types:', error);
    }
}
const server = app.listen(config_1.default.PORT, () => {
    logger_1.default.info(`TypeScript types server running at http://localhost:${config_1.default.PORT} in ${config_1.default.NODE_ENV} mode`);
    updateTypes();
});
function gracefulShutdown(signal) {
    return () => {
        logger_1.default.info(`Received ${signal} signal, shutting down...`);
        server.close(() => {
            logger_1.default.info('Server closed');
            process.exit(0);
        });
    };
}
process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
});
setInterval(updateTypes, 60 * 60 * 1000);
