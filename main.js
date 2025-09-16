const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const { ImageProcessor } = require('./imageProcessor');
const { FolderWatcher } = require('./folderWatcher');
const Logger = require('./logger');

const store = new Store();
const logger = new Logger();

let mainWindow;
let tray;
let imageProcessor;
let folderWatcher;

const autoLauncher = new AutoLaunch({
  name: 'Nostalgia Box Image Stitcher',
  path: app.getPath('exe'),
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(trayIconPath);

  // Set as template for theme awareness
  tray.setImage(trayIconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setToolTip('Nostalgia Box Image Stitcher');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  const watchFolder = store.get('watchFolder', app.getPath('pictures'));

  // Initialize imageProcessor and folderWatcher immediately
  if (!imageProcessor) {
    const outputFolder = store.get('outputFolder');
    imageProcessor = new ImageProcessor(logger, outputFolder, watchFolder);
  } else {
    imageProcessor.setWatchFolder(watchFolder);
  }
  if (!folderWatcher) {
    folderWatcher = new FolderWatcher(watchFolder, imageProcessor, logger);
  }

  const autoStart = store.get('autoStart', true);
  if (autoStart) {
    autoLauncher.enable();
  }

  logger.info('Application started');

  const isPaused = store.get('isPaused', false);
  if (!isPaused) {
    folderWatcher.start();

    // Scan for existing images on startup
    setTimeout(() => {
      performStartupScan();
    }, 2000); // Give folder watcher time to initialize
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];
    store.set('watchFolder', newPath);

    if (folderWatcher) {
      folderWatcher.stop();
      folderWatcher = new FolderWatcher(newPath, imageProcessor, logger);

      const isPaused = store.get('isPaused', false);
      if (!isPaused) {
        folderWatcher.start();
      }
    }

    // Update imageProcessor with new watch folder
    if (imageProcessor) {
      imageProcessor.setWatchFolder(newPath);
    }

    logger.info(`Watch folder changed to: ${newPath}`);
    return newPath;
  }
  return null;
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];
    store.set('outputFolder', newPath);

    // Update imageProcessor with new output folder
    if (imageProcessor) {
      imageProcessor.setOutputFolder(newPath);
    }

    logger.info(`Output folder changed to: ${newPath}`);
    return newPath;
  }
  return null;
});

ipcMain.handle('get-settings', () => {
  return {
    watchFolder: store.get('watchFolder', app.getPath('pictures')),
    outputFolder: store.get('outputFolder'),
    isPaused: store.get('isPaused', false),
    autoStart: store.get('autoStart', true)
  };
});

ipcMain.handle('toggle-pause', () => {
  const isPaused = store.get('isPaused', false);
  const newState = !isPaused;
  store.set('isPaused', newState);

  // Ensure folderWatcher is initialized
  if (!folderWatcher) {
    const watchFolder = store.get('watchFolder', app.getPath('pictures'));
    if (!imageProcessor) {
      const outputFolder = store.get('outputFolder');
      imageProcessor = new ImageProcessor(logger, outputFolder);
    }
    folderWatcher = new FolderWatcher(watchFolder, imageProcessor, logger);
  }

  if (newState) {
    folderWatcher.stop();
    logger.info('Processing paused');
  } else {
    folderWatcher.start();
    logger.info('Processing resumed');
  }

  return newState;
});

ipcMain.handle('toggle-auto-start', async () => {
  const currentState = store.get('autoStart', true);
  const newState = !currentState;
  store.set('autoStart', newState);

  if (newState) {
    await autoLauncher.enable();
  } else {
    await autoLauncher.disable();
  }

  logger.info(`Auto-start ${newState ? 'enabled' : 'disabled'}`);
  return newState;
});


ipcMain.handle('get-logs', () => {
  return logger.getRecentLogs();
});

// Global function to send status updates
global.sendStatusUpdate = (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', data);
  }
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function performStartupScan() {
  const watchFolder = store.get('watchFolder', app.getPath('pictures'));
  const outputFolder = store.get('outputFolder');

  logger.info('Performing startup scan for unprocessed images...');

  try {
    const fs = require('fs').promises;
    const path = require('path');

    // Get all image files from watch folder
    const allImages = [];
    const imagesByDirectory = {};

    async function scanDir(dir) {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.includes('Processed')) {
          await scanDir(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'].includes(ext)) {
            allImages.push(fullPath);

            const parentDir = path.dirname(fullPath);
            if (!imagesByDirectory[parentDir]) {
              imagesByDirectory[parentDir] = [];
            }
            imagesByDirectory[parentDir].push(fullPath);
          }
        }
      }
    }

    await scanDir(watchFolder);

    // Check each directory for unprocessed groups
    for (const [directory, images] of Object.entries(imagesByDirectory)) {
      if (images.length >= 2 && images.length <= 6) {
        // Sort alphabetically
        images.sort((a, b) => {
          const nameA = path.basename(a).toLowerCase();
          const nameB = path.basename(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        // Check if this group has already been processed using the log
        const isProcessed = await imageProcessor.isGroupProcessed(images);

        if (!isProcessed) {
          logger.info(`Found unprocessed group: ${images.length} images in ${directory}`);
          await imageProcessor.addToQueue(images);

          if (global.sendStatusUpdate) {
            global.sendStatusUpdate({
              message: `Startup scan: Processing ${images.length} unprocessed images`,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          logger.info(`Skipping already processed group in ${directory} (found in log)`);
        }
      }
    }

    logger.info('Startup scan completed');
  } catch (error) {
    logger.error(`Startup scan error: ${error.message}`);
  }
}

app.on('before-quit', () => {
  app.isQuitting = true;
  if (folderWatcher) {
    folderWatcher.stop();
  }
  if (mainWindow) {
    mainWindow.destroy();
  }
  logger.info('Application shutting down');
});