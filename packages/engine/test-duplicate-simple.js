// Simple test to verify duplicate job handling
import { CleanCueDatabase } from './src/database.js';

async function test() {
  const db = new CleanCueDatabase(':memory:');
  await db.initialize();

  // Create first job
  console.log('Creating first job...');
  await db.createJob('test-job', 'scan', 5, { test: 'data' }, true);
  console.log('✅ First job created successfully');

  // Try to create duplicate
  console.log('Attempting to create duplicate job...');
  try {
    await db.createJob('test-job', 'analyze', 3, { test: 'data' }, true);
    console.log('❌ ERROR: Duplicate job was created - this should not happen!');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('✅ Duplicate job correctly rejected with UNIQUE constraint error');
    } else {
      console.log('❌ ERROR: Wrong error type:', error.message);
      process.exit(1);
    }
  }

  await db.close();
  console.log('✅ Test passed - duplicate job handling works correctly');
}

test().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});