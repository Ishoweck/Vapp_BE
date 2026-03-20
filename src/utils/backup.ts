import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const RETENTION_DAYS = 7;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Run mongodump to create a database backup
 */
function runBackup(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/vendorspot';

    const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    logger.info(`Starting database backup to ${backupPath}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Database backup failed:', error.message);
        reject(error);
        return;
      }

      if (stderr && !stderr.includes('done dumping')) {
        logger.warn('mongodump stderr:', stderr);
      }

      logger.info(`Database backup completed successfully: ${backupPath}`);
      resolve();
    });
  });
}

/**
 * Delete backups older than RETENTION_DAYS
 */
function cleanOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const now = Date.now();
    const entries = fs.readdirSync(BACKUP_DIR);

    for (const entry of entries) {
      const entryPath = path.join(BACKUP_DIR, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory() && entry.startsWith('backup-')) {
        const ageMs = now - stat.mtimeMs;
        if (ageMs > RETENTION_DAYS * TWENTY_FOUR_HOURS_MS) {
          fs.rmSync(entryPath, { recursive: true, force: true });
          logger.info(`Deleted old backup: ${entry}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error cleaning old backups:', error);
  }
}

/**
 * Setup daily database backup using setInterval (every 24 hours).
 * Runs an initial backup on startup, then repeats every 24 hours.
 * Also cleans up backups older than 7 days.
 */
export function setupDailyBackup(): void {
  logger.info('Daily database backup scheduler initialized');

  // Run initial backup after a short delay (30 seconds) to let the server fully start
  setTimeout(async () => {
    try {
      await runBackup();
      cleanOldBackups();
    } catch (error) {
      logger.error('Initial backup failed:', error);
    }
  }, 30000);

  // Schedule backup every 24 hours
  setInterval(async () => {
    try {
      await runBackup();
      cleanOldBackups();
    } catch (error) {
      logger.error('Scheduled backup failed:', error);
    }
  }, TWENTY_FOUR_HOURS_MS);
}
