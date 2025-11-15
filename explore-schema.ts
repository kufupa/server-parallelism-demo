import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultSqlConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

interface Table {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
}

interface Column {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
}

interface RowCount {
  row_count: number;
}

(async (): Promise<void> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    const sqlConfig = getDefaultSqlConfig();
    pool = await connectToDatabase(sqlConfig);

    // Get all schemas and tables
    const tablesResult = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    console.log('=== DATABASE SCHEMA ===\n');

    for (const table of tablesResult.recordset as Table[]) {
      const { TABLE_SCHEMA, TABLE_NAME } = table;
      console.log(`\n[${TABLE_SCHEMA}].[${TABLE_NAME}]`);
      console.log('-'.repeat(50));

      // Get columns for each table
      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${TABLE_SCHEMA}' AND TABLE_NAME = '${TABLE_NAME}'
        ORDER BY ORDINAL_POSITION
      `);

      for (const col of columnsResult.recordset as Column[]) {
        const nullable = col.IS_NULLABLE === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}`);
      }

      // Get row count
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as row_count FROM [${TABLE_SCHEMA}].[${TABLE_NAME}]
      `);
      const rowCount = (countResult.recordset[0] as RowCount).row_count;
      console.log(`  → ${rowCount} rows`);
    }

    if (pool) {
      await closeConnection(pool);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Error:', error);
    process.exit(1);
  }
})();
