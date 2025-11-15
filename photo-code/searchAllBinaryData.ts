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

async function searchBinaryData() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Database connected\n');

    console.log('='.repeat(70));
    console.log('🔍 SEARCHING FOR ANY ACTUAL BINARY DATA IN DATABASE');
    console.log('='.repeat(70) + '\n');

    // Check ALL varbinary columns for any non-null data
    const binaryColumnsWithData = await pool.request().query(`
      SELECT TOP 50
        'Warehouse.StockItems' as TableName,
        'Photo' as ColumnName,
        StockItemID as RecordID,
        StockItemName as Description,
        DATALENGTH(Photo) as ByteSize,
        'VARBINARY' as DataType
      FROM Warehouse.StockItems
      WHERE Photo IS NOT NULL

      UNION ALL

      SELECT TOP 50
        'Application.People',
        'Photo',
        PersonID,
        FullName,
        DATALENGTH(Photo),
        'VARBINARY'
      FROM Application.People
      WHERE Photo IS NOT NULL

      UNION ALL

      SELECT TOP 50
        'Application.People_Archive',
        'Photo',
        PersonID,
        FullName,
        DATALENGTH(Photo),
        'VARBINARY'
      FROM Application.People_Archive
      WHERE Photo IS NOT NULL

      UNION ALL

      SELECT TOP 50
        'Warehouse.StockItems_Archive',
        'Photo',
        StockItemID,
        StockItemName,
        DATALENGTH(Photo),
        'VARBINARY'
      FROM Warehouse.StockItems_Archive
      WHERE Photo IS NOT NULL

      UNION ALL

      SELECT TOP 50
        'Warehouse.VehicleTemperatures',
        'CompressedSensorData',
        VehicleTemperatureID,
        CAST(VehicleTemperatureID AS NVARCHAR),
        DATALENGTH(CompressedSensorData),
        'VARBINARY'
      FROM Warehouse.VehicleTemperatures
      WHERE CompressedSensorData IS NOT NULL

      UNION ALL

      SELECT TOP 50
        'Application.People',
        'HashedPassword',
        PersonID,
        FullName,
        DATALENGTH(HashedPassword),
        'VARBINARY'
      FROM Application.People
      WHERE HashedPassword IS NOT NULL

      ORDER BY ByteSize DESC
    `);

    if (binaryColumnsWithData.recordset.length === 0) {
      console.log('❌ NO BINARY DATA FOUND\n');
      console.log('Summary:');
      console.log('  - [Warehouse].StockItems.Photo: EMPTY');
      console.log('  - [Application].People.Photo: EMPTY');
      console.log('  - [Warehouse].StockItems_Archive.Photo: EMPTY');
      console.log('  - [Application].People_Archive.Photo: EMPTY');
      console.log('  - [Warehouse].VehicleTemperatures.CompressedSensorData: EMPTY');
      console.log('  - [Application].People.HashedPassword: (passwords - not images)\n');
    } else {
      console.log(`✅ FOUND ${binaryColumnsWithData.recordset.length} RECORDS WITH BINARY DATA\n`);

      binaryColumnsWithData.recordset.forEach((record: any, index: number) => {
        console.log(`${index + 1}. ${record.TableName}.${record.ColumnName}`);
        console.log(`   Record ID: ${record.RecordID}`);
        console.log(`   Description: ${record.Description}`);
        console.log(`   Data Size: ${record.ByteSize} bytes (${(record.ByteSize / 1024).toFixed(2)} KB)`);
        console.log(`   Type: ${record.DataType}`);
        console.log();
      });
    }

    // Check for any actual images by looking at data patterns
    console.log('='.repeat(70));
    console.log('🔎 CHECKING FOR IMAGE FORMATS IN BINARY DATA');
    console.log('='.repeat(70) + '\n');

    const imageFormatCheck = await pool.request().query(`
      -- Check for JPEG magic bytes (FF D8 FF)
      SELECT TOP 10
        'JPEG Files (FF D8 FF)' as Format,
        COUNT(*) as Count,
        'StockItems.Photo' as Location
      FROM Warehouse.StockItems
      WHERE Photo IS NOT NULL AND LEFT(Photo, 3) = 0xFFD8FF

      UNION ALL

      -- Check for PNG magic bytes (89 50 4E 47)
      SELECT TOP 10
        'PNG Files (89 50 4E 47)',
        COUNT(*),
        'StockItems.Photo'
      FROM Warehouse.StockItems
      WHERE Photo IS NOT NULL AND LEFT(Photo, 4) = 0x89504E47

      UNION ALL

      -- Check for GIF magic bytes (47 49 46)
      SELECT TOP 10
        'GIF Files (47 49 46)',
        COUNT(*),
        'StockItems.Photo'
      FROM Warehouse.StockItems
      WHERE Photo IS NOT NULL AND LEFT(Photo, 3) = 0x474946

      UNION ALL

      -- Check People photos
      SELECT TOP 10
        'JPEG Files (FF D8 FF)',
        COUNT(*),
        'People.Photo'
      FROM Application.People
      WHERE Photo IS NOT NULL AND LEFT(Photo, 3) = 0xFFD8FF

      UNION ALL

      SELECT TOP 10
        'PNG Files (89 50 4E 47)',
        COUNT(*),
        'People.Photo'
      FROM Application.People
      WHERE Photo IS NOT NULL AND LEFT(Photo, 4) = 0x89504E47

      UNION ALL

      SELECT TOP 10
        'GIF Files (47 49 46)',
        COUNT(*),
        'People.Photo'
      FROM Application.People
      WHERE Photo IS NOT NULL AND LEFT(Photo, 3) = 0x474946
    `);

    const imageCount = imageFormatCheck.recordset.filter((r: any) => r.Count > 0);
    if (imageCount.length === 0) {
      console.log('❌ NO IMAGE FILES FOUND IN DATABASE\n');
      console.log('Checked for:');
      console.log('  - JPEG files (magic bytes: FF D8 FF)');
      console.log('  - PNG files (magic bytes: 89 50 4E 47)');
      console.log('  - GIF files (magic bytes: 47 49 46)\n');
    } else {
      console.log('✅ IMAGE FILES FOUND:\n');
      imageCount.forEach((img: any) => {
        console.log(`  ${img.Format} in ${img.Location}: ${img.Count} file(s)`);
      });
      console.log();
    }

    // Final verdict
    console.log('='.repeat(70));
    console.log('📋 FINAL VERDICT');
    console.log('='.repeat(70) + '\n');

    if (binaryColumnsWithData.recordset.length === 0 && imageCount.length === 0) {
      console.log('❌ NO REAL PHOTO DATA EXISTS IN THIS DATABASE');
      console.log('\nAll photo columns are empty/NULL:');
      console.log('  ✗ Warehouse.StockItems.Photo');
      console.log('  ✗ Application.People.Photo');
      console.log('  ✗ Warehouse.StockItems_Archive.Photo');
      console.log('  ✗ Application.People_Archive.Photo');
      console.log('\nDatabase has photo schema but NO actual image data stored.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.close();
  }
}

searchBinaryData();
