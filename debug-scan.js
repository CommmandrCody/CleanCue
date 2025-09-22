#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Debug script to test folder scanning functionality
 * This will help identify exactly why scanning is failing
 */

async function testFolderAccess(folderPath) {
  console.log(`🔍 Testing folder access for: ${folderPath}`);

  try {
    // Test 1: Check if path exists
    console.log('  ✓ Testing path existence...');
    const stat = await fs.stat(folderPath);
    console.log(`  ✓ Path exists and is ${stat.isDirectory() ? 'directory' : 'file'}`);

    // Test 2: Check read permissions
    console.log('  ✓ Testing read permissions...');
    await fs.access(folderPath, fs.constants.R_OK);
    console.log('  ✓ Read permissions OK');

    // Test 3: Try to read directory contents
    if (stat.isDirectory()) {
      console.log('  ✓ Testing directory read...');
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      console.log(`  ✓ Found ${entries.length} entries in directory`);

      // Test 4: Look for audio files
      const audioExtensions = ['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.wma', '.aiff', '.ape'];
      const audioFiles = entries.filter(entry => {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          return audioExtensions.includes(ext);
        }
        return false;
      });

      console.log(`  ✓ Found ${audioFiles.length} audio files:`);
      audioFiles.slice(0, 5).forEach(file => {
        console.log(`    - ${file.name}`);
      });
      if (audioFiles.length > 5) {
        console.log(`    ... and ${audioFiles.length - 5} more`);
      }

      // Test 5: Try to access first audio file
      if (audioFiles.length > 0) {
        const firstAudioFile = path.join(folderPath, audioFiles[0].name);
        console.log(`  ✓ Testing access to first audio file: ${audioFiles[0].name}`);
        try {
          const fileStat = await fs.stat(firstAudioFile);
          console.log(`  ✓ File accessible, size: ${(fileStat.size / 1024 / 1024).toFixed(2)}MB`);
        } catch (error) {
          console.log(`  ❌ Cannot access audio file: ${error.message}`);
        }
      }

    } else {
      console.log('  ℹ️  Path is a file, not a directory');
    }

    return { success: true, audioFileCount: audioFiles ? audioFiles.length : 0 };

  } catch (error) {
    console.log(`  ❌ Error during folder access test: ${error.message}`);
    console.log(`  ❌ Error code: ${error.code || 'UNKNOWN'}`);

    // Provide specific guidance based on error type
    if (error.code === 'ENOENT') {
      console.log(`  💡 The folder path does not exist. Please check the path is correct.`);
    } else if (error.code === 'EACCES') {
      console.log(`  💡 Permission denied. Please check folder permissions.`);
    } else if (error.code === 'EPERM') {
      console.log(`  💡 Operation not permitted. May need to grant app permissions.`);
    }

    return { success: false, error: error.message, code: error.code };
  }
}

async function testSpecificPath() {
  // Test the path that was failing in the logs
  const testPath = '/Users/wagner/Music/DJ-WIP/ClubPoolParty';
  console.log('🧪 Testing the specific path that was failing...\n');

  const result = await testFolderAccess(testPath);

  if (result.success) {
    console.log(`\n✅ SUCCESS: Folder scanning should work! Found ${result.audioFileCount} audio files.`);
  } else {
    console.log(`\n❌ FAILED: This explains why scanning failed.`);
    console.log(`Error: ${result.error}`);

    // Suggest alternative test paths
    console.log(`\n💡 Try testing with a simpler path like:`);
    console.log(`   - Your Desktop folder`);
    console.log(`   - A folder in your Documents`);
    console.log(`   - Or create a test folder with a few MP3 files`);
  }
}

async function testMultiplePaths() {
  console.log('🔍 Testing multiple common paths...\n');

  const testPaths = [
    '/Users/wagner/Music',
    '/Users/wagner/Desktop',
    '/Users/wagner/Documents',
    '/Users/wagner/Downloads'
  ];

  for (const testPath of testPaths) {
    console.log(`\n--- Testing: ${testPath} ---`);
    await testFolderAccess(testPath);
  }
}

async function main() {
  console.log('🚀 CleanCue Folder Scanning Diagnostic Tool\n');
  console.log('This tool will help identify why folder scanning is failing.\n');

  // Test the specific failing path first
  await testSpecificPath();

  console.log('\n' + '='.repeat(60) + '\n');

  // Test some common paths
  await testMultiplePaths();

  console.log('\n🏁 Diagnostic complete!');
  console.log('\nIf all tests pass but scanning still fails, the issue is likely in:');
  console.log('  1. The engine initialization');
  console.log('  2. The IPC communication between UI and engine');
  console.log('  3. The database connection');
}

main().catch(console.error);