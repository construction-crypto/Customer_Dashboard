import fs from 'fs';
import path from 'path';

const QUEUE_FILE = path.join(process.cwd(), 'db', 'offline-queue.json');

// Ensure queue file exists
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify([]));
}

export function enqueueWrite(action, data) {
  try {
    const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    queue.push({ action, data, timestamp: new Date().toISOString() });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    console.warn('[OFFLINE QUEUE] Database offline. Write operation saved to local queue.');
  } catch (err) {
    console.error('[OFFLINE QUEUE ERROR] Failed to write to offline queue:', err);
  }
}

export async function processQueue(dbConnection) {
  if (!fs.existsSync(QUEUE_FILE)) return;
  try {
    const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    if (queue.length === 0) return;

    console.log(`[OFFLINE QUEUE] Attempting to sync ${queue.length} offline operations...`);
    const remainingQueue = [];

    for (const item of queue) {
      try {
        // Execute the queued write operation against PostgreSQL
        if (item.action === 'insert_project') {
          await dbConnection.insert(item.data.table).values(item.data.values);
        }
      } catch (err) {
        // Keep in queue if database is still down
        remainingQueue.push(item);
      }
    }

    fs.writeFileSync(QUEUE_FILE, JSON.stringify(remainingQueue, null, 2));
    if (remainingQueue.length === 0) {
      console.log('[OFFLINE QUEUE] All offline operations successfully synchronized.');
    }
  } catch (err) {
    console.error('[OFFLINE QUEUE ERROR] Failed to process sync queue:', err);
  }
}
