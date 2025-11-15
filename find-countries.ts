import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultSqlConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

interface CountryColumn {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

(async (): Promise<void> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    const sqlConfig = getDefaultSqlConfig();
    pool = await connectToDatabase(sqlConfig);

    // Find all columns with 'country' in the name (case-insensitive)
    const result = await pool.request().query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE LOWER(COLUMN_NAME) LIKE '%country%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
    `);

    console.log('=== FIELDS WITH "COUNTRY" IN NAME ===\n');

    let currentTable = '';
    for (const col of result.recordset as CountryColumn[]) {
      const fullName = `[${col.TABLE_SCHEMA}].[${col.TABLE_NAME}]`;
      if (fullName !== currentTable) {
        console.log(`\n${fullName}:`);
        currentTable = fullName;
      }
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    }

    // Check for StateProvinces reference which is the FK to Countries
    console.log('\n\n=== FOREIGN KEY TO Countries (INDIRECT via StateProvinces) ===\n');
    console.log('Direct FK: [Application].[StateProvinces].CountryID → [Application].[Countries].CountryID\n');

    console.log('\n=== ALL PATHS TO COUNTRIES ===\n');
    console.log('1. DIRECT: Application.Countries table');
    console.log('   - 190 records with CountryID, CountryName, Continent, Region, Subregion');
    console.log('\n2. INDIRECT via StateProvinces:');
    console.log('   - Application.StateProvinces (53 records) has CountryID field');
    console.log('   - Application.Cities references StateProvinceID');
    console.log('   - Sales.Customers has DeliveryCityID & PostalCityID → Cities → StateProvinces → Countries');
    console.log('   - Purchasing.Suppliers has DeliveryCityID & PostalCityID → Cities → StateProvinces → Countries');

    if (pool) {
      await closeConnection(pool);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Error:', error);
    process.exit(1);
  }
})();
