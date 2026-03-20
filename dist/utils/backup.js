"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDailyBackup = setupDailyBackup;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./logger");
const BACKUP_DIR = path_1.default.resolve(__dirname, '../../backups');
const RETENTION_DAYS = 7;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
/**
 * Run mongodump to create a database backup
 */
function runBackup() {
    return new Promise((resolve, reject) => {
        // Ensure backup directory exists
        if (!fs_1.default.existsSync(BACKUP_DIR)) {
            fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(BACKUP_DIR, `backup-${timestamp}`);
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/vendorspot';
        const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
        logger_1.logger.info(`Starting database backup to ${backupPath}`);
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                logger_1.logger.error('Database backup failed:', error.message);
                reject(error);
                return;
            }
            if (stderr && !stderr.includes('done dumping')) {
                logger_1.logger.warn('mongodump stderr:', stderr);
            }
            logger_1.logger.info(`Database backup completed successfully: ${backupPath}`);
            resolve();
        });
    });
}
/**
 * Delete backups older than RETENTION_DAYS
 */
function cleanOldBackups() {
    try {
        if (!fs_1.default.existsSync(BACKUP_DIR))
            return;
        const now = Date.now();
        const entries = fs_1.default.readdirSync(BACKUP_DIR);
        for (const entry of entries) {
            const entryPath = path_1.default.join(BACKUP_DIR, entry);
            const stat = fs_1.default.statSync(entryPath);
            if (stat.isDirectory() && entry.startsWith('backup-')) {
                const ageMs = now - stat.mtimeMs;
                if (ageMs > RETENTION_DAYS * TWENTY_FOUR_HOURS_MS) {
                    fs_1.default.rmSync(entryPath, { recursive: true, force: true });
                    logger_1.logger.info(`Deleted old backup: ${entry}`);
                }
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error cleaning old backups:', error);
    }
}
/**
 * Setup daily database backup using setInterval (every 24 hours).
 * Runs an initial backup on startup, then repeats every 24 hours.
 * Also cleans up backups older than 7 days.
 */
function setupDailyBackup() {
    logger_1.logger.info('Daily database backup scheduler initialized');
    // Run initial backup after a short delay (30 seconds) to let the server fully start
    setTimeout(async () => {
        try {
            await runBackup();
            cleanOldBackups();
        }
        catch (error) {
            logger_1.logger.error('Initial backup failed:', error);
        }
    }, 30000);
    // Schedule backup every 24 hours
    setInterval(async () => {
        try {
            await runBackup();
            cleanOldBackups();
        }
        catch (error) {
            logger_1.logger.error('Scheduled backup failed:', error);
        }
    }, TWENTY_FOUR_HOURS_MS);
}
//# sourceMappingURL=backup.js.map