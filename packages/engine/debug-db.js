// Debug script to test database query
import { CleanCueDatabase } from './src/database.js';

async function test() {
  const db = new CleanCueDatabase();
  await db.initialize();

  console.log('Testing getJobsByStatus...');
  const result = db.getJobsByStatus('queued');
  console.log('Result:', result);
  console.log('Type:', typeof result);
  console.log('IsArray:', Array.isArray(result));

  // Test execQuery directly
  console.log('\nTesting execQuery directly...');
  const directResult = db.execQuery('SELECT * FROM jobs WHERE status = ?', ['queued']);
  console.log('Direct result:', directResult);

  await db.close();
}

test().catch(console.error);