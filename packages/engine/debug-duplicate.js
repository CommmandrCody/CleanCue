// Debug script to test duplicate job creation
import { CleanCueDatabase } from './src/database.js';

async function testDuplicate() {
  const db = new CleanCueDatabase();
  await db.initialize();

  console.log('Creating first job...');
  try {
    await db.createJob('test-job', 'scan', 5, { test: 'data' }, true);
    console.log('First job created successfully');
  } catch (error) {
    console.error('First job failed:', error.message);
  }

  console.log('Creating duplicate job...');
  try {
    await db.createJob('test-job', 'analyze', 3, { test: 'data' }, true);
    console.log('Second job created - this should not happen!');
  } catch (error) {
    console.log('Second job correctly failed:', error.message);
  }

  await db.close();
}

testDuplicate().catch(console.error);