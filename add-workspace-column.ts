import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const sql = postgres('postgresql://dms_user:dms_password@localhost:5432/document_management');
const db = drizzle(sql);

async function addColumn() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(36)`;
    console.log('✓ Column workspace_id added successfully');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await sql.end();
  }
}

addColumn();
