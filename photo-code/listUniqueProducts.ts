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

async function listUniqueProducts() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();

    // Get unique products
    const result = await pool.request().query(`
      SELECT
        si.StockItemID,
        si.StockItemName,
        si.Brand,
        si.Size,
        si.UnitPrice,
        c.ColorName,
        pt.PackageTypeName,
        si.QuantityPerOuter,
        si.TypicalWeightPerUnit,
        CASE WHEN si.IsChillerStock = 1 THEN 'Yes' ELSE 'No' END as IsChillerStock,
        STRING_AGG(sg.StockGroupName, ', ') WITHIN GROUP (ORDER BY sg.StockGroupName) as StockGroups
      FROM Warehouse.StockItems si
      LEFT JOIN Warehouse.Colors c ON si.ColorID = c.ColorID
      LEFT JOIN Warehouse.PackageTypes pt ON si.UnitPackageID = pt.PackageTypeID
      LEFT JOIN Warehouse.StockItemStockGroups sisg ON si.StockItemID = sisg.StockItemID
      LEFT JOIN Warehouse.StockGroups sg ON sisg.StockGroupID = sg.StockGroupID
      GROUP BY si.StockItemID, si.StockItemName, si.Brand, si.Size, si.UnitPrice, c.ColorName, pt.PackageTypeName, si.QuantityPerOuter, si.TypicalWeightPerUnit, si.IsChillerStock
      ORDER BY si.StockItemID
    `);

    console.log('\n' + '='.repeat(120));
    console.log('📦 ALL PRODUCTS IN WAREHOUSE (UNIQUE)');
    console.log('='.repeat(120) + '\n');
    console.log(`Total Unique Products: ${result.recordset.length}\n`);

    result.recordset.forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.StockItemName}`);
      console.log(`   Product ID: ${product.StockItemID}`);
      if (product.Brand) console.log(`   Brand: ${product.Brand}`);
      if (product.Size) console.log(`   Size: ${product.Size}`);
      console.log(`   Unit Price: $${product.UnitPrice}`);
      if (product.StockGroups) console.log(`   Categories: ${product.StockGroups}`);
      if (product.ColorName) console.log(`   Color: ${product.ColorName}`);
      if (product.PackageTypeName) console.log(`   Package Type: ${product.PackageTypeName}`);
      if (product.QuantityPerOuter) console.log(`   Quantity Per Outer: ${product.QuantityPerOuter}`);
      if (product.TypicalWeightPerUnit) console.log(`   Weight Per Unit: ${product.TypicalWeightPerUnit} g`);
      console.log(`   Chiller Required: ${product.IsChillerStock}`);
      console.log();
    });

    // Get summary by category
    console.log('='.repeat(120));
    console.log('\n📊 PRODUCTS BY CATEGORY\n');

    const categoryResult = await pool.request().query(`
      SELECT
        sg.StockGroupName,
        COUNT(DISTINCT si.StockItemID) as ProductCount,
        AVG(si.UnitPrice) as AvgPrice,
        MIN(si.UnitPrice) as MinPrice,
        MAX(si.UnitPrice) as MaxPrice
      FROM Warehouse.StockGroups sg
      LEFT JOIN Warehouse.StockItemStockGroups sisg ON sg.StockGroupID = sisg.StockGroupID
      LEFT JOIN Warehouse.StockItems si ON sisg.StockItemID = si.StockItemID
      GROUP BY sg.StockGroupName
      ORDER BY ProductCount DESC
    `);

    categoryResult.recordset.forEach((cat: any) => {
      if (cat.ProductCount > 0) {
        console.log(`${cat.StockGroupName}: ${cat.ProductCount} products`);
        console.log(`  Price Range: $${cat.MinPrice} - $${cat.MaxPrice}`);
        console.log(`  Average Price: $${cat.AvgPrice.toFixed(2)}\n`);
      }
    });

    console.log('='.repeat(120));
    console.log(`\n✅ Total: ${result.recordset.length} unique products in warehouse\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.close();
  }
}

listUniqueProducts();
