const fs = require('fs').promises;
const path = require('path');

class NostalgiaBoxTester {
  constructor() {
    // Set these paths based on your test setup
    this.sourceDir = '/path/to/source/folders'; // Image #1 - Replace with actual path
    this.targetDir = '/path/to/target/watch/folder'; // Image #2 - Replace with actual path
    this.outputDir = '/path/to/output/processed/folder'; // Image #3 - Replace with actual path

    this.testInterval = 60000; // 1 minute in milliseconds
    this.processingWaitTime = 30000; // 30 seconds to wait for processing
    this.currentTest = 0;
    this.testResults = [];
    this.isRunning = false;
  }

  async initialize() {
    console.log('🧪 Initializing Nostalgia Box Test Suite');

    // Verify all directories exist
    try {
      await fs.access(this.sourceDir);
      await fs.access(this.targetDir);
      await fs.access(this.outputDir);
      console.log('✅ All test directories accessible');
    } catch (error) {
      console.error('❌ Directory access error:', error.message);
      console.log('Please update the paths in the test script:');
      console.log(`Source Dir: ${this.sourceDir}`);
      console.log(`Target Dir: ${this.targetDir}`);
      console.log(`Output Dir: ${this.outputDir}`);
      return false;
    }

    // Get list of folders to test
    this.testFolders = await this.getTestFolders();
    console.log(`📁 Found ${this.testFolders.length} test folders`);

    return true;
  }

  async getTestFolders() {
    try {
      const items = await fs.readdir(this.sourceDir, { withFileTypes: true });
      const folders = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => !name.startsWith('.'));

      return folders;
    } catch (error) {
      console.error('Error reading source directory:', error);
      return [];
    }
  }

  async countImagesInFolder(folderPath) {
    try {
      const items = await fs.readdir(folderPath);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'];

      const imageCount = items.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      }).length;

      return imageCount;
    } catch (error) {
      console.error(`Error counting images in ${folderPath}:`, error);
      return 0;
    }
  }

  async moveFolder(folderName) {
    const sourcePath = path.join(this.sourceDir, folderName);
    const targetPath = path.join(this.targetDir, folderName);

    try {
      // Use cp -R to copy (preserve original for repeated testing)
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      await execPromise(`cp -R "${sourcePath}" "${targetPath}"`);
      console.log(`📂 Moved folder: ${folderName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to move ${folderName}:`, error);
      return false;
    }
  }

  async checkForProcessedFile(folderName, expectedImageCount) {
    // Wait for processing
    console.log(`⏳ Waiting ${this.processingWaitTime/1000}s for processing...`);
    await new Promise(resolve => setTimeout(resolve, this.processingWaitTime));

    try {
      const files = await fs.readdir(this.outputDir);

      // Look for files that match the expected pattern
      const matchingFiles = files.filter(file => {
        // Check if filename contains folder name and correct image count
        const containsFolderName = file.toLowerCase().includes(folderName.toLowerCase());
        const containsImageCount = file.includes(`${expectedImageCount}images`);
        const isJpg = file.toLowerCase().endsWith('.jpg');

        return containsFolderName && containsImageCount && isJpg;
      });

      if (matchingFiles.length > 0) {
        console.log(`✅ Found processed file: ${matchingFiles[0]}`);
        return {
          success: true,
          filename: matchingFiles[0],
          expectedCount: expectedImageCount
        };
      } else {
        console.log(`❌ No matching processed file found for ${folderName}`);
        console.log(`   Expected: Contains "${folderName}" and "${expectedImageCount}images"`);
        console.log(`   Available files: ${files.join(', ')}`);
        return {
          success: false,
          expectedCount: expectedImageCount,
          availableFiles: files
        };
      }
    } catch (error) {
      console.error('Error checking output directory:', error);
      return { success: false, error: error.message };
    }
  }

  async runSingleTest(folderName) {
    console.log(`\n🔄 Running test ${this.currentTest + 1}/${this.testFolders.length}: ${folderName}`);

    const testStart = Date.now();

    // Count images in source folder
    const sourceFolderPath = path.join(this.sourceDir, folderName);
    const imageCount = await this.countImagesInFolder(sourceFolderPath);

    console.log(`📊 Folder contains ${imageCount} images`);

    if (imageCount < 2 || imageCount > 6) {
      console.log(`⚠️  Skipping ${folderName}: ${imageCount} images (need 2-6)`);
      return {
        folderName,
        imageCount,
        skipped: true,
        reason: 'Invalid image count'
      };
    }

    // Move folder
    const moveSuccess = await this.moveFolder(folderName);
    if (!moveSuccess) {
      return {
        folderName,
        imageCount,
        success: false,
        error: 'Failed to move folder'
      };
    }

    // Check for processed file
    const result = await this.checkForProcessedFile(folderName, imageCount);

    const testDuration = Date.now() - testStart;

    return {
      folderName,
      imageCount,
      success: result.success,
      filename: result.filename,
      duration: testDuration,
      ...result
    };
  }

  async runAllTests() {
    if (this.isRunning) {
      console.log('Tests are already running!');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    this.currentTest = 0;

    console.log(`\n🚀 Starting automated test sequence`);
    console.log(`⏰ Testing ${this.testFolders.length} folders with ${this.testInterval/1000}s intervals\n`);

    for (const folderName of this.testFolders) {
      const result = await this.runSingleTest(folderName);
      this.testResults.push(result);
      this.currentTest++;

      // Wait before next test (except for the last one)
      if (this.currentTest < this.testFolders.length) {
        console.log(`⏳ Waiting ${this.testInterval/1000}s before next test...`);
        await new Promise(resolve => setTimeout(resolve, this.testInterval));
      }
    }

    this.isRunning = false;
    this.printSummary();
  }

  printSummary() {
    console.log('\n📋 TEST SUMMARY');
    console.log('================');

    const successful = this.testResults.filter(r => r.success);
    const failed = this.testResults.filter(r => !r.success && !r.skipped);
    const skipped = this.testResults.filter(r => r.skipped);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⚠️  Skipped: ${skipped.length}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    if (failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failed.forEach(test => {
        console.log(`  • ${test.folderName} (${test.imageCount} images): ${test.error || 'Processing failed'}`);
      });
    }

    if (successful.length > 0) {
      console.log('\n✅ SUCCESSFUL TESTS:');
      successful.forEach(test => {
        console.log(`  • ${test.folderName} → ${test.filename} (${test.duration}ms)`);
      });
    }

    const successRate = (successful.length / (this.testResults.length - skipped.length) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
  }

  // Manual test runner for specific folder
  async testSpecificFolder(folderName) {
    if (!this.testFolders.includes(folderName)) {
      console.log(`❌ Folder "${folderName}" not found in source directory`);
      return;
    }

    console.log(`🧪 Running single test for: ${folderName}`);
    const result = await this.runSingleTest(folderName);
    console.log('\n📋 Result:', result);
  }
}

// Usage examples:
async function main() {
  const tester = new NostalgiaBoxTester();

  // Update these paths before running!
  tester.sourceDir = '/Users/oliverkompst/Desktop/TestFolders';  // Your source folders
  tester.targetDir = '/Users/oliverkompst/Desktop/WatchFolder';  // Your watch folder
  tester.outputDir = '/Users/oliverkompst/Desktop/ProcessedOutput'; // Your output folder

  const initialized = await tester.initialize();

  if (!initialized) {
    console.log('❌ Initialization failed. Please check your paths.');
    return;
  }

  // Uncomment one of these to run:

  // Run all tests automatically:
  // await tester.runAllTests();

  // Or test a specific folder:
  // await tester.testSpecificFolder('YourFolderName');

  console.log('⚠️  Update the directory paths in the script and uncomment a test method to run!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { NostalgiaBoxTester };