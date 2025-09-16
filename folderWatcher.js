const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;

class FolderWatcher {
  constructor(watchPath, imageProcessor, logger) {
    this.watchPath = watchPath;
    this.imageProcessor = imageProcessor;
    this.logger = logger;
    this.watcher = null;
    this.imageBuffer = [];
    this.bufferTimeout = null;
    this.bufferDelay = 5000;
    this.supportedFormats = ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'];
  }

  start() {
    if (this.watcher) {
      this.stop();
    }

    const watchPattern = path.join(this.watchPath, '**/*');

    this.watcher = chokidar.watch(watchPattern, {
      ignored: [
        /(^|[\/\\])\../,
        '**/Processed/**',
        '**/.DS_Store'
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleNewFile(filePath))
      .on('error', (error) => this.logger.error(`Watcher error: ${error}`))
      .on('ready', () => {
        this.logger.info(`Watching folder: ${this.watchPath}`);
        if (global.sendStatusUpdate) {
          global.sendStatusUpdate({
            message: `Started watching: ${this.watchPath}`,
            timestamp: new Date().toISOString()
          });
        }
      });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.clearBuffer();
      this.logger.info('Folder watching stopped');
    }
  }

  async handleNewFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (!this.supportedFormats.includes(ext)) {
      return;
    }

    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);

    if (dirName.includes('Processed')) {
      return;
    }

    this.logger.info(`New image detected: ${fileName} in ${dirName}`);

    // Group images by parent directory
    const parentDir = path.dirname(filePath);

    this.imageBuffer.push({
      path: filePath,
      directory: parentDir,
      timestamp: Date.now()
    });

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    // Process immediately if we have enough images from the same folder
    const sameDirectoryImages = this.imageBuffer.filter(img => img.directory === parentDir);
    if (sameDirectoryImages.length >= 6) {
      this.processBuffer();
    } else {
      this.bufferTimeout = setTimeout(() => {
        this.processBuffer();
      }, this.bufferDelay);
    }

    if (global.sendStatusUpdate) {
      global.sendStatusUpdate({
        message: `Buffering: ${fileName} (${this.imageBuffer.length} total images)`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async processBuffer() {
    if (this.imageBuffer.length < 2) {
      this.logger.info('Not enough images to process (minimum 2 required)');
      this.clearBuffer();
      return;
    }

    // Group images by directory
    const imagesByDirectory = {};
    for (const img of this.imageBuffer) {
      if (!imagesByDirectory[img.directory]) {
        imagesByDirectory[img.directory] = [];
      }
      imagesByDirectory[img.directory].push(img);
    }

    // Process each directory separately
    for (const [directory, images] of Object.entries(imagesByDirectory)) {
      if (images.length >= 2) {
        // Sort by timestamp to maintain order
        images.sort((a, b) => a.timestamp - b.timestamp);

        // Take up to 6 images from this directory
        const imagesToProcess = images.slice(0, Math.min(6, images.length));

        this.logger.info(`Processing ${imagesToProcess.length} images from ${directory}`);

        try {
          const validImages = [];
          for (const img of imagesToProcess) {
            try {
              await fs.access(img.path);
              validImages.push(img.path);
              // Remove processed images from buffer
              const index = this.imageBuffer.findIndex(buffered => buffered.path === img.path);
              if (index > -1) {
                this.imageBuffer.splice(index, 1);
              }
            } catch (err) {
              this.logger.warn(`File no longer accessible: ${img.path}`);
            }
          }

          if (validImages.length >= 2) {
            await this.imageProcessor.addToQueue(validImages);
          }
        } catch (error) {
          this.logger.error(`Error processing buffer for ${directory}: ${error.message}`);
        }
      }
    }

    // Check if there are remaining images to process
    if (this.imageBuffer.length >= 2) {
      this.bufferTimeout = setTimeout(() => {
        this.processBuffer();
      }, this.bufferDelay);
    } else if (this.imageBuffer.length === 1) {
      // Keep the timeout alive for single remaining image
      this.bufferTimeout = setTimeout(() => {
        this.clearBuffer();
      }, this.bufferDelay * 2);
    } else {
      this.clearBuffer();
    }
  }

  clearBuffer() {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    this.imageBuffer = [];
  }
}

module.exports = { FolderWatcher };