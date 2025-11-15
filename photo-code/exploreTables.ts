import sql from 'mssql';

const config: sql.config = {
  server: 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  port: 1433,
  database: 'WideWorldImporters_Base',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'hackathon_ro_05',
      password: process.env.DB_PASSWORD || 'B8^cNp1%',
    },
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function exploreTables() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Database connected\n');

    // Find all tables with varbinary columns (potential image storage)
    console.log('='.repeat(70));
    console.log('🔍 Searching for VARBINARY columns across all tables');
    console.log('='.repeat(70) + '\n');

    const binaryColumns = await pool.request().query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE DATA_TYPE IN ('varbinary', 'image')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    if (binaryColumns.recordset.length > 0) {
      console.log('Tables with VARBINARY/IMAGE columns:\n');
      binaryColumns.recordset.forEach((col: any) => {
        console.log(`  [${col.TABLE_SCHEMA}].${col.TABLE_NAME}.${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
    } else {
      console.log('No VARBINARY/IMAGE columns found');
    }

    // Check all table names and row counts
    console.log('\n' + '='.repeat(70));
    console.log('📊 All Tables in Database with Row Counts');
    console.log('='.repeat(70) + '\n');

    const allTables = await pool.request().query(`
      SELECT
        SCHEMA_NAME(t.schema_id) as SchemaName,
        t.name as TableName,
        SUM(p.rows) as [RowCount]
      FROM sys.tables t
      LEFT JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
      WHERE SCHEMA_NAME(t.schema_id) NOT IN ('sys', 'information_schema')
      GROUP BY SCHEMA_NAME(t.schema_id), t.name
      ORDER BY SchemaName, TableName
    `);

    console.log('Complete Database Schema:\n');
    const groupedBySchema: Record<string, any[]> = {};

    allTables.recordset.forEach((table: any) => {
      if (!groupedBySchema[table.SchemaName]) {
        groupedBySchema[table.SchemaName] = [];
      }
      groupedBySchema[table.SchemaName].push(table);
    });

    Object.keys(groupedBySchema).forEach((schema) => {
      console.log(`[${schema}]`);
      groupedBySchema[schema].forEach((table: any) => {
        console.log(`  - ${table.TableName} (${table.RowCount || '?'} rows)`);
      });
      console.log();
    });

    // Look for any content with "photo", "image", "picture" in column names
    console.log('='.repeat(70));
    console.log('🎨 Searching for photo/image related columns (case-insensitive)');
    console.log('='.repeat(70) + '\n');

    const imageColumns = await pool.request().query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE UPPER(COLUMN_NAME) LIKE '%PHOTO%'
        OR UPPER(COLUMN_NAME) LIKE '%IMAGE%'
        OR UPPER(COLUMN_NAME) LIKE '%PICTURE%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    if (imageColumns.recordset.length > 0) {
      console.log('Photo/Image related columns:\n');
      imageColumns.recordset.forEach((col: any) => {
        console.log(`  [${col.TABLE_SCHEMA}].${col.TABLE_NAME}.${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
    } else {
      console.log('No photo/image related columns found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.close();
  }
}

exploreTables();
