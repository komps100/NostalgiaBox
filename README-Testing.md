# Nostalgia Box Automated Testing

This testing suite automatically moves folders from a source directory to the watch folder and validates that the correct stitched images are created.

## Setup

### 1. Directory Structure
Create three directories for testing:

```
/Users/yourname/Desktop/
├── TestSourceFolders/     # Contains folders with test images
│   ├── Vacation2024/      # 3 images
│   ├── Wedding/           # 4 images
│   └── Birthday/          # 2 images
├── NostalgiaBoxWatch/     # App watches this folder
└── NostalgiaBoxOutput/    # App outputs here
```

### 2. Configure Nostalgia Box App
1. Launch the Nostalgia Box app
2. Set **Watch Folder** to: `/Users/yourname/Desktop/NostalgiaBoxWatch/`
3. Set **Output Folder** to: `/Users/yourname/Desktop/NostalgiaBoxOutput/`
4. Make sure the app is **not paused**

### 3. Update Test Script Paths
Edit `run-test.js` and update these paths:
```javascript
tester.sourceDir = '/Users/yourname/Desktop/TestSourceFolders';
tester.targetDir = '/Users/yourname/Desktop/NostalgiaBoxWatch';
tester.outputDir = '/Users/yourname/Desktop/NostalgiaBoxOutput';
```

## Running Tests

### Run All Tests (Automated)
```bash
node run-test.js
```
This will:
- Move each folder from source to watch directory (1 minute intervals)
- Wait 30 seconds for processing
- Check if correct output file was created
- Generate a summary report

### Test Specific Folder
```bash
node run-test.js "Vacation2024"
```

### What the Test Validates
- ✅ Correct number of images detected
- ✅ Output file created with folder name
- ✅ Output filename contains correct image count
- ✅ Processing happens within expected timeframe

## Expected Output Format
For a folder named `Vacation2024` with 3 images:
- Expected output: `Vacation2024_3images_2024-09-15T16-45-30.jpg`

## Test Results
The script will show:
- ✅ **Successful tests**: Folder processed correctly
- ❌ **Failed tests**: Processing failed or incorrect output
- ⚠️ **Skipped tests**: Folders with invalid image counts (not 2-6)

## Customization
Adjust timing in the script:
```javascript
tester.testInterval = 60000;        // Time between tests (ms)
tester.processingWaitTime = 30000;  // Wait for processing (ms)
```

## Troubleshooting
- Make sure Nostalgia Box app is running and not paused
- Check that watch/output folders are correctly configured
- Verify test folders contain 2-6 images each
- Check file permissions on all directories