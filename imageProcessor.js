const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  constructor(logger, outputFolder = null) {
    this.logger = logger;
    this.queue = [];
    this.processing = false;
    this.outputFolder = outputFolder;
  }

  setOutputFolder(folder) {
    this.outputFolder = folder;
  }

  async addToQueue(images) {
    this.queue.push(images);
    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const images = this.queue.shift();

    try {
      await this.stitchImages(images);
    } catch (error) {
      this.logger.error(`Failed to process images: ${error.message}`);
    }

    this.processQueue();
  }

  findCommonPrefix(filenames) {
    if (filenames.length === 0) return '';
    if (filenames.length === 1) return path.basename(filenames[0], path.extname(filenames[0]));

    // Get just the base names without paths and extensions
    const baseNames = filenames.map(f => path.basename(f, path.extname(f)));

    // Find common prefix
    let prefix = '';
    for (let i = 0; i < baseNames[0].length; i++) {
      const char = baseNames[0][i];
      if (baseNames.every(name => name[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }

    // Clean up trailing underscores or hyphens
    prefix = prefix.replace(/[_-]+$/, '');

    return prefix || 'stitched';
  }

  async stitchImages(imagePaths) {
    const count = imagePaths.length;
    if (count < 2 || count > 6) {
      this.logger.warn(`Invalid number of images: ${count}. Expected 2-6.`);
      return;
    }

    // Sort images alphabetically by filename
    imagePaths.sort((a, b) => {
      const nameA = path.basename(a).toLowerCase();
      const nameB = path.basename(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    this.logger.info(`Processing ${count} images for stitching (sorted alphabetically)`);
    this.logger.info(`Image order: ${imagePaths.map(p => path.basename(p)).join(', ')}`);

    try {
      // IMPORTANT: We're only reading the images, never modifying originals
      const images = await Promise.all(
        imagePaths.map(async (imgPath) => {
          const img = sharp(imgPath);
          const metadata = await img.metadata();
          return { path: imgPath, sharp: img, metadata };
        })
      );

      const layout = this.getGridLayout(count);
      const stitched = await this.createStitchedImage(images, layout);

      // Determine output directory
      let outputDir;
      if (this.outputFolder) {
        outputDir = this.outputFolder;
      } else {
        outputDir = path.join(path.dirname(imagePaths[0]), 'Processed');
      }

      await fs.mkdir(outputDir, { recursive: true });

      // Generate filename based on common parts
      const commonName = this.findCommonPrefix(imagePaths);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const outputPath = path.join(outputDir, `${commonName}_${count}images_${timestamp}.jpg`);

      await stitched.toFile(outputPath);

      this.logger.info(`Successfully stitched ${count} images to: ${outputPath}`);

      if (global.sendStatusUpdate) {
        global.sendStatusUpdate({
          message: `Stitched ${count} images successfully`,
          timestamp: new Date().toISOString(),
          outputPath
        });
      }

    } catch (error) {
      this.logger.error(`Error stitching images: ${error.message}`);
      throw error;
    }
  }

  getGridLayout(count) {
    const layouts = {
      2: { cols: 2, rows: 1, positions: [[0, 0], [1, 0]] },
      3: { cols: 2, rows: 2, positions: [[0, 0], [1, 0], [0.5, 1]] },
      4: { cols: 2, rows: 2, positions: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      5: { cols: 3, rows: 2, positions: [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1]] },
      6: { cols: 3, rows: 2, positions: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] }
    };
    return layouts[count];
  }

  async createStitchedImage(images, layout) {
    const maxWidth = Math.max(...images.map(img => img.metadata.width));
    const maxHeight = Math.max(...images.map(img => img.metadata.height));

    const cellWidth = maxWidth;
    const cellHeight = maxHeight;

    const canvasWidth = cellWidth * layout.cols;
    const canvasHeight = cellHeight * layout.rows;

    const composites = await Promise.all(
      images.map(async (img, index) => {
        const position = layout.positions[index];
        const x = Math.floor(position[0] * cellWidth);
        const y = Math.floor(position[1] * cellHeight);

        const buffer = await img.sharp.toBuffer();

        return {
          input: buffer,
          left: x,
          top: y
        };
      })
    );

    return sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite(composites)
    .jpeg({ quality: 100 });
  }
}

module.exports = { ImageProcessor };