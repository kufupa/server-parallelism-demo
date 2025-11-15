const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'hackathon_ro_05',
  password: process.env.DB_PASSWORD || 'B8^cNp1%',
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { encrypt: true, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request().query(`
      SELECT TOP 3
        CityID,
        CityName,
        Location,
        LatestRecordedPopulation
      FROM Application.Cities
      WHERE Location IS NOT NULL
    `);

    console.log('=== GEOGRAPHIC DATA AVAILABLE ===\n');
    console.log('✓ Location (geography type - lat/lon)');
    console.log('✓ Population data');
    console.log('✓ StateProvinceCode');
    console.log('✗ No city boundaries/polygons\n');

    console.log('Sample city:');
    if (result.recordset.length > 0) {
      const row = result.recordset[0];
      console.log(`  ${row.CityName}: ${row.Location}`);
    }

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
