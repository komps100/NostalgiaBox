#!/usr/bin/env node

const { NostalgiaBoxTester } = require('./test-automation');

async function runTests() {
  console.log('🧪 Nostalgia Box Test Runner');
  console.log('============================\n');

  const tester = new NostalgiaBoxTester();

  // TODO: Update these paths to match your test setup
  tester.sourceDir = '/Users/oliverkompst/Desktop/TestSourceFolders';  // Where test folders are stored
  tester.targetDir = '/Users/oliverkompst/Desktop/NostalgiaBoxWatch';   // App's watch folder
  tester.outputDir = '/Users/oliverkompst/Desktop/NostalgiaBoxOutput';  // App's output folder

  // Optional: Adjust timing
  tester.testInterval = 60000;        // 1 minute between tests
  tester.processingWaitTime = 30000;  // 30 seconds to wait for processing

  console.log('📁 Configuration:');
  console.log(`   Source: ${tester.sourceDir}`);
  console.log(`   Target: ${tester.targetDir}`);
  console.log(`   Output: ${tester.outputDir}`);
  console.log(`   Interval: ${tester.testInterval/1000}s`);
  console.log(`   Wait time: ${tester.processingWaitTime/1000}s\n`);

  const initialized = await tester.initialize();

  if (!initialized) {
    console.log('❌ Test initialization failed!');
    console.log('\n📝 Setup Instructions:');
    console.log('1. Create the source directory with test folders');
    console.log('2. Each folder should contain 2-6 images');
    console.log('3. Set up the Nostalgia Box app to watch the target directory');
    console.log('4. Configure the app to output to the output directory');
    console.log('5. Update the paths in this script');
    return;
  }

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Test specific folder
    const folderName = args[0];
    console.log(`🎯 Testing specific folder: ${folderName}`);
    await tester.testSpecificFolder(folderName);
  } else {
    // Run all tests
    console.log('🚀 Running all tests automatically...');
    console.log('💡 Tip: Use "node run-test.js FolderName" to test a specific folder\n');
    await tester.runAllTests();
  }
}

// Error handling
runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});