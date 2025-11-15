import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultSqlConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

interface ColumnInfo {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
}

interface CountResult {
  row_count: number;
}

(async (): Promise<void> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    const sqlConfig = getDefaultSqlConfig();
    pool = await connectToDatabase(sqlConfig);
    console.log('\n=== HackathonMetadata Table Schema ===\n');

    const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'Application' AND TABLE_NAME = 'HackathonMetadata'
      ORDER BY ORDINAL_POSITION
    `);

    if (schemaResult.recordset.length === 0) {
      console.log('Table not found!');
    } else {
      console.log('Columns:');
      console.table(schemaResult.recordset as ColumnInfo[]);

      console.log('\n=== Row Count ===\n');
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as row_count FROM [Application].[HackathonMetadata]
      `);
      const rowCount = (countResult.recordset[0] as CountResult).row_count;
      console.log(`Total records: ${rowCount}`);

      // Try to get all records anyway
      console.log('\n=== All Records ===\n');
      const dataResult = await pool.request().query(`
        SELECT * FROM [Application].[HackathonMetadata]
      `);

      if (dataResult.recordset.length === 0) {
        console.log('(Table is empty)');
      } else {
        console.table(dataResult.recordset);
        console.log('\n=== JSON Format ===\n');
        console.log(JSON.stringify(dataResult.recordset, null, 2));
      }
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
