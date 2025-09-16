const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class Logger {
  constructor() {
    const logDir = path.join(app.getPath('userData'), 'logs');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

    this.recentLogs = [];
    this.maxRecentLogs = 100;

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: logFile }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  info(message, meta = {}) {
    this.addToRecent('info', message);
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.addToRecent('warn', message);
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.addToRecent('error', message);
    this.logger.error(message, meta);
  }

  addToRecent(level, message) {
    this.recentLogs.unshift({
      timestamp: new Date().toISOString(),
      level,
      message
    });

    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.pop();
    }
  }

  getRecentLogs() {
    return this.recentLogs;
  }
}

module.exports = Logger;