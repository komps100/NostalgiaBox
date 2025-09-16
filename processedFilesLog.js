const fs = require('fs').promises;
const path = require('path');

class ProcessedFilesLog {
  constructor(watchFolder) {
    this.watchFolder = watchFolder;
    this.logPath = path.join(watchFolder, '.nostalgia-box-processed.json');
    this.processedGroups = new Map();
    this.loaded = false;
  }

  async load() {
    try {
      const data = await fs.readFile(this.logPath, 'utf8');
      const parsed = JSON.parse(data);

      // Convert array back to Map
      this.processedGroups = new Map(parsed.processedGroups || []);
      this.loaded = true;
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.processedGroups = new Map();
      this.loaded = true;
    }
  }

  async save() {
    try {
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        processedGroups: Array.from(this.processedGroups.entries())
      };

      await fs.writeFile(this.logPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save processed files log:', error);
    }
  }

  generateGroupKey(imagePaths) {
    // Create a unique key for this group of images
    const sortedPaths = [...imagePaths].sort();
    const relativeKeys = sortedPaths.map(p => path.relative(this.watchFolder, p));
    return relativeKeys.join('|');
  }

  async markAsProcessed(imagePaths, outputPath) {
    if (!this.loaded) {
      await this.load();
    }

    const groupKey = this.generateGroupKey(imagePaths);
    const processedInfo = {
      imagePaths: imagePaths.map(p => path.relative(this.watchFolder, p)),
      outputPath: path.relative(this.watchFolder, outputPath),
      processedAt: new Date().toISOString(),
      imageCount: imagePaths.length
    };

    this.processedGroups.set(groupKey, processedInfo);
    await this.save();
  }

  async isGroupProcessed(imagePaths) {
    if (!this.loaded) {
      await this.load();
    }

    const groupKey = this.generateGroupKey(imagePaths);
    return this.processedGroups.has(groupKey);
  }

  async getProcessedInfo(imagePaths) {
    if (!this.loaded) {
      await this.load();
    }

    const groupKey = this.generateGroupKey(imagePaths);
    return this.processedGroups.get(groupKey);
  }

  async getProcessedCount() {
    if (!this.loaded) {
      await this.load();
    }

    return this.processedGroups.size;
  }

  async cleanup() {
    // Remove entries for files that no longer exist
    if (!this.loaded) {
      await this.load();
    }

    let cleaned = false;
    for (const [groupKey, info] of this.processedGroups.entries()) {
      // Check if all source images still exist
      const allExist = await Promise.all(
        info.imagePaths.map(async (relativePath) => {
          try {
            const fullPath = path.join(this.watchFolder, relativePath);
            await fs.access(fullPath);
            return true;
          } catch {
            return false;
          }
        })
      );

      if (!allExist.every(exists => exists)) {
        this.processedGroups.delete(groupKey);
        cleaned = true;
      }
    }

    if (cleaned) {
      await this.save();
    }
  }
}

module.exports = { ProcessedFilesLog };