# Nostalgia Box

A powerful Electron-based image stitching application that automatically monitors folders for new images and combines them into grid layouts.

## Features

- **Automatic Image Monitoring**: Watches designated folders for new images and processes them automatically
- **Intelligent Grid Layouts**: Supports 2-6 images with optimized grid arrangements
- **Smart Background Selection**: Black backgrounds for odd-numbered grids (3, 5), white for even (2, 4, 6)
- **Folder-Based Naming**: Output files use clean folder names without timestamps or metadata
- **Startup Processing**: Automatically processes any unprocessed image groups on launch
- **System Tray Integration**: Runs quietly in the system tray with easy access controls
- **Auto-Launch Support**: Optional startup with system boot
- **Processed File Tracking**: Prevents duplicate processing of the same image groups

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd nostalgia-box

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

## Usage

### First Launch
1. Launch the application
2. Select your watch folder (where new images will be monitored)
3. Optionally set a custom output folder (defaults to "Processed" subfolder)
4. The app will automatically process any existing unprocessed image groups

### Automatic Processing
- Drop 2-6 images into any subfolder within your watch directory
- The app automatically detects new images and combines them into grids
- Processed images are saved to the output folder with clean filenames

### Controls
- **Pause/Resume**: Stop or start automatic processing
- **Auto-Start**: Toggle automatic launch with system startup
- **System Tray**: Access controls and logs from the system tray

## File Organization

### Input Structure
```
Watch Folder/
├── Project1/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── image3.jpg
└── Project2/
    ├── photo1.png
    └── photo2.png
```

### Output Structure
```
Output Folder/
├── Project1.jpg    # 3-image grid with black background
└── Project2.jpg    # 2-image grid with white background
```

## Grid Layouts

- **2 images**: 2×1 horizontal layout
- **3 images**: 2×2 grid with bottom center placement
- **4 images**: 2×2 perfect grid
- **5 images**: 3×2 grid with bottom row centered
- **6 images**: 3×2 perfect grid

## Supported Formats

Input: `.jpg`, `.jpeg`, `.png`, `.tiff`, `.bmp`, `.webp`
Output: High-quality JPEG files

## Configuration

Settings are automatically saved and include:
- Watch folder path
- Output folder path (optional)
- Pause state
- Auto-start preference

## Development

### Scripts
- `npm start`: Run the app
- `npm run dev`: Development mode with auto-reload
- `npm run build`: Build distributables for macOS
- `npm run dist`: Build DMG for macOS (both Intel and Apple Silicon)

### Architecture
- **main.js**: Electron main process, app lifecycle, IPC handlers
- **renderer.js**: Frontend UI logic and event handling
- **imageProcessor.js**: Core image stitching and processing logic
- **folderWatcher.js**: File system monitoring and change detection
- **processedFilesLog.js**: Tracking system for processed image groups
- **logger.js**: Application logging system

### Building
The build process creates universal macOS applications:
- Intel x64 DMG
- Apple Silicon ARM64 DMG

Both include proper code signing configuration and can be distributed independently.

## Troubleshooting

### Common Issues
1. **Images not processing**: Check that image formats are supported and not in "Processed" folders
2. **Missing output folder**: App creates folders automatically, ensure write permissions
3. **Startup scan not working**: Verify watch folder path exists and contains images

### Logs
Access detailed logs through the application interface or system tray menu.

## License

MIT License - see LICENSE file for details.