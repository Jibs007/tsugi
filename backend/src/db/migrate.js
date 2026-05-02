#!/usr/bin/env node
/**
 * Run: node src/db/migrate.js
 * Applies schema.sql idempotently (all statements are IF NOT EXISTS / CREATE OR REPLACE).
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dir, 'schema.sql'), 'utf8');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations…');
    await client.query(sql);
    console.log('✓ Schema applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
