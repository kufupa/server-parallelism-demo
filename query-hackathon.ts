import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultSqlConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

(async (): Promise<void> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    const sqlConfig = getDefaultSqlConfig();
    pool = await connectToDatabase(sqlConfig);
    console.log('\n');

    // Query HackathonMetadata table
    const result = await pool.request().query(`
      SELECT * FROM [Application].[HackathonMetadata]
    `);

    console.log('=== HackathonMetadata Table Contents ===\n');

    if (result.recordset.length === 0) {
      console.log('(No records found)');
    } else {
      // Display as formatted table
      console.table(result.recordset);

      // Also display as JSON for clarity
      console.log('\n=== JSON Format ===\n');
      console.log(JSON.stringify(result.recordset, null, 2));
    }

    console.log(`\nTotal records: ${result.recordset.length}`);

    if (pool) {
      await closeConnection(pool);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Error:', error);
    process.exit(1);
  }
})();
