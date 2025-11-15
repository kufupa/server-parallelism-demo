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

async function testQueries() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Database connected\n');

    // Check if Photo column exists in StockItems
    console.log('='.repeat(70));
    console.log('🔍 Testing StockItems Table Structure');
    console.log('='.repeat(70));

    const stockItemsInfo = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='StockItems' AND TABLE_SCHEMA='Warehouse'`
      );

    console.log('\nStockItems Columns:');
    stockItemsInfo.recordset.forEach((col: any) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check if Photo column exists in People
    console.log('\n' + '='.repeat(70));
    console.log('🔍 Testing People Table Structure');
    console.log('='.repeat(70));

    const peopleInfo = await pool
      .request()
      .query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='People' AND TABLE_SCHEMA='Application'`
      );

    console.log('\nPeople Columns:');
    peopleInfo.recordset.forEach((col: any) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Count photos in StockItems
    console.log('\n' + '='.repeat(70));
    console.log('📊 Photo Data Statistics');
    console.log('='.repeat(70));

    const stockItemStats = await pool.request().query(`
      SELECT
        COUNT(*) as TotalStockItems,
        SUM(CASE WHEN Photo IS NOT NULL THEN 1 ELSE 0 END) as ItemsWithPhotos,
        AVG(DATALENGTH(Photo)) as AvgPhotoSize,
        MIN(DATALENGTH(Photo)) as MinPhotoSize,
        MAX(DATALENGTH(Photo)) as MaxPhotoSize
      FROM Warehouse.StockItems
    `);

    console.log('\nStockItems Photos:');
    const itemStats = stockItemStats.recordset[0];
    console.log(`  Total Items: ${itemStats.TotalStockItems}`);
    console.log(`  Items with Photos: ${itemStats.ItemsWithPhotos}`);
    if (itemStats.AvgPhotoSize) {
      console.log(`  Avg Photo Size: ${Math.round(itemStats.AvgPhotoSize / 1024)} KB`);
      console.log(`  Min Photo Size: ${Math.round(itemStats.MinPhotoSize / 1024)} KB`);
      console.log(`  Max Photo Size: ${Math.round(itemStats.MaxPhotoSize / 1024)} KB`);
    }

    const peopleStats = await pool.request().query(`
      SELECT
        COUNT(*) as TotalPeople,
        SUM(CASE WHEN Photo IS NOT NULL THEN 1 ELSE 0 END) as PeopleWithPhotos,
        AVG(DATALENGTH(Photo)) as AvgPhotoSize,
        MIN(DATALENGTH(Photo)) as MinPhotoSize,
        MAX(DATALENGTH(Photo)) as MaxPhotoSize
      FROM Application.People
    `);

    console.log('\nPeople Photos:');
    const peopleStatsData = peopleStats.recordset[0];
    console.log(`  Total People: ${peopleStatsData.TotalPeople}`);
    console.log(`  People with Photos: ${peopleStatsData.PeopleWithPhotos}`);
    if (peopleStatsData.AvgPhotoSize) {
      console.log(`  Avg Photo Size: ${Math.round(peopleStatsData.AvgPhotoSize / 1024)} KB`);
      console.log(`  Min Photo Size: ${Math.round(peopleStatsData.MinPhotoSize / 1024)} KB`);
      console.log(`  Max Photo Size: ${Math.round(peopleStatsData.MaxPhotoSize / 1024)} KB`);
    }

    // Try to fetch actual examples
    console.log('\n' + '='.repeat(70));
    console.log('📸 Sample Photo Data');
    console.log('='.repeat(70));

    const stockItemPhotos = await pool.request().query(`
      SELECT TOP 5
        StockItemID,
        StockItemName,
        Brand,
        UnitPrice,
        DATALENGTH(Photo) as PhotoSizeBytes
      FROM Warehouse.StockItems
      WHERE Photo IS NOT NULL
      ORDER BY StockItemID
    `);

    console.log('\n✓ StockItems with Photos:');
    if (stockItemPhotos.recordset.length > 0) {
      stockItemPhotos.recordset.forEach((item: any, i: number) => {
        console.log(`  ${i + 1}. ${item.StockItemName}`);
        console.log(`     ID: ${item.StockItemID}, Brand: ${item.Brand}, Price: $${item.UnitPrice}`);
        console.log(`     Photo Size: ${(item.PhotoSizeBytes / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log('  No photos found in StockItems');
    }

    const peoplePhotos = await pool.request().query(`
      SELECT TOP 5
        PersonID,
        FullName,
        EmailAddress,
        DATALENGTH(Photo) as PhotoSizeBytes
      FROM Application.People
      WHERE Photo IS NOT NULL
      ORDER BY PersonID
    `);

    console.log('\n✓ People with Photos:');
    if (peoplePhotos.recordset.length > 0) {
      peoplePhotos.recordset.forEach((person: any, i: number) => {
        console.log(`  ${i + 1}. ${person.FullName}`);
        console.log(`     ID: ${person.PersonID}, Email: ${person.EmailAddress}`);
        console.log(`     Photo Size: ${(person.PhotoSizeBytes / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log('  No photos found in People');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.close();
  }
}

testQueries();
