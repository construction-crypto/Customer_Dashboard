import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { enqueueWrite, processQueue } from './queue';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const baseDb = drizzle(pool, { schema });

// Periodically attempt to flush offline queue every 30 seconds
setInterval(() => {
  processQueue(baseDb);
}, 30000);

export const db = {
  ...baseDb,
  async safeInsert(table, values) {
    try {
      return await baseDb.insert(table).values(values);
    } catch (err) {
      console.warn('[DB WARNING] Connection lost. Queuing insert locally...');
      // Determine table name or pass schema reference safely
      enqueueWrite('insert_project', { values });
      return { success: false, queued: true, error: err.message };
    }
  }
};
