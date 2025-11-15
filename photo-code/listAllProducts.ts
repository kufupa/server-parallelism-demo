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

async function listAllProducts() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Database connected\n');

    console.log('='.repeat(100));
    console.log('📦 ALL PRODUCTS IN WAREHOUSE');
    console.log('='.repeat(100) + '\n');

    const result = await pool.request().query(`
      SELECT
        si.StockItemID,
        si.StockItemName,
        si.Brand,
        si.Size,
        si.UnitPrice,
        sg.StockGroupName,
        c.ColorName,
        pt.PackageTypeName,
        si.QuantityPerOuter,
        si.TypicalWeightPerUnit,
        CASE WHEN si.IsChillerStock = 1 THEN 'Yes' ELSE 'No' END as IsChillerStock
      FROM Warehouse.StockItems si
      LEFT JOIN Warehouse.StockGroups sg ON si.StockItemID IN (
        SELECT StockItemID FROM Warehouse.StockItemStockGroups
        WHERE StockGroupID = sg.StockGroupID
      )
      LEFT JOIN Warehouse.Colors c ON si.ColorID = c.ColorID
      LEFT JOIN Warehouse.PackageTypes pt ON si.UnitPackageID = pt.PackageTypeID
      ORDER BY si.StockItemID
    `);

    console.log(`Total Products: ${result.recordset.length}\n`);

    result.recordset.forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.StockItemName}`);
      console.log(`   ID: ${product.StockItemID}`);
      console.log(`   Brand: ${product.Brand || 'N/A'}`);
      console.log(`   Size: ${product.Size || 'N/A'}`);
      console.log(`   Price: $${product.UnitPrice}`);
      console.log(`   Stock Group: ${product.StockGroupName || 'N/A'}`);
      console.log(`   Color: ${product.ColorName || 'N/A'}`);
      console.log(`   Package Type: ${product.PackageTypeName || 'N/A'}`);
      console.log(`   Quantity Per Outer: ${product.QuantityPerOuter || 'N/A'}`);
      console.log(`   Weight Per Unit: ${product.TypicalWeightPerUnit || 'N/A'} g`);
      console.log(`   Requires Chiller: ${product.IsChillerStock}`);
      console.log();
    });

    console.log('='.repeat(100));
    console.log(`\n✅ Total: ${result.recordset.length} products in warehouse`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.close();
  }
}

listAllProducts();
