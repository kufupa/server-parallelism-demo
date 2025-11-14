const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'hackathon_ro_05',
  password: process.env.DB_PASSWORD || 'B8^cNp1%',
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

(async () => {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('Connected to database\n');

    // Get all schemas and tables
    const tablesResult = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    console.log('=== DATABASE SCHEMA ===\n');

    for (const table of tablesResult.recordset) {
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

      for (const col of columnsResult.recordset) {
        const nullable = col.IS_NULLABLE === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}`);
      }

      // Get row count
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as row_count FROM [${TABLE_SCHEMA}].[${TABLE_NAME}]
      `);
      const rowCount = countResult.recordset[0].row_count;
      console.log(`  → ${rowCount} rows`);
    }

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
