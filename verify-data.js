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
    console.log('✓ Connected to database\n');

    // VERIFICATION 1: Check if OrderLines.UnitPrice matches StockItems.UnitPrice
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION 1: Price Comparison');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const priceCheckResult = await pool.request().query(`
      SELECT TOP 50
        ol.OrderLineID,
        ol.OrderID,
        si.StockItemName,
        ol.UnitPrice as OrderLinePrice,
        si.UnitPrice as StockItemPrice,
        CASE WHEN ol.UnitPrice = si.UnitPrice THEN 'EQUAL' ELSE 'DIFFERENT' END as Comparison,
        ol.Quantity,
        (ol.Quantity * ol.UnitPrice) as LineValue,
        (ol.Quantity * si.UnitPrice) as CostValue,
        (ol.Quantity * (ol.UnitPrice - si.UnitPrice)) as Profit
      FROM Sales.OrderLines ol
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
      ORDER BY NEWID()
    `);

    console.table(priceCheckResult.recordset);

    // VERIFICATION 2: Check StockItems columns to see what fields are available
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION 2: StockItems Table Structure');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'StockItems'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(schemaResult.recordset);

    // VERIFICATION 3: Check OrderLines columns
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION 3: OrderLines Table Structure');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const orderSchemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'OrderLines'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(orderSchemaResult.recordset);

    // VERIFICATION 4: Look at actual data for Customer 149
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION 4: Detailed Look at Customer 149 Orders');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const customer149Result = await pool.request().query(`
      SELECT TOP 20
        ol.OrderID,
        ol.OrderLineID,
        si.StockItemID,
        si.StockItemName,
        ol.UnitPrice as SoldPrice,
        si.UnitPrice as ListPrice,
        ol.Quantity,
        ol.TaxRate,
        ol.PickedQuantity,
        (ol.Quantity * ol.UnitPrice) as LineTotal
      FROM Sales.OrderLines ol
      JOIN Sales.Orders o ON ol.OrderID = o.OrderID
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
      WHERE o.CustomerID = 149
      ORDER BY ol.OrderID DESC
    `);

    console.table(customer149Result.recordset);

    // VERIFICATION 5: Check if there's a TaxRate or other fields affecting the price
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION 5: Price Statistics Across All Orders');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as TotalOrderLines,
        COUNT(CASE WHEN ol.UnitPrice = si.UnitPrice THEN 1 END) as PriceEqual,
        COUNT(CASE WHEN ol.UnitPrice > si.UnitPrice THEN 1 END) as PriceHigher,
        COUNT(CASE WHEN ol.UnitPrice < si.UnitPrice THEN 1 END) as PriceLower,
        COUNT(CASE WHEN ol.UnitPrice <> si.UnitPrice THEN 1 END) as PriceDifferent,
        MIN(ol.UnitPrice) as MinSoldPrice,
        MAX(ol.UnitPrice) as MaxSoldPrice,
        MIN(si.UnitPrice) as MinListPrice,
        MAX(si.UnitPrice) as MaxListPrice,
        AVG(ol.UnitPrice) as AvgSoldPrice,
        AVG(si.UnitPrice) as AvgListPrice
      FROM Sales.OrderLines ol
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    `);

    console.table(statsResult.recordset);

    // VERIFICATION 6: Check profit where prices are different
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION 6: Products with DIFFERENT Prices (where margin exists)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const profitResult = await pool.request().query(`
      SELECT TOP 50
        si.StockItemName,
        ol.UnitPrice as SoldPrice,
        si.UnitPrice as ListPrice,
        (ol.UnitPrice - si.UnitPrice) as PricePerUnit,
        SUM(ol.Quantity) as TotalQty,
        SUM(ol.Quantity * (ol.UnitPrice - si.UnitPrice)) as TotalProfit,
        CAST(((ol.UnitPrice - si.UnitPrice) / ol.UnitPrice * 100) AS DECIMAL(5,2)) as ProfitMarginPercent,
        COUNT(DISTINCT ol.OrderID) as OrderCount
      FROM Sales.OrderLines ol
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
      WHERE ol.UnitPrice <> si.UnitPrice
      GROUP BY si.StockItemName, ol.UnitPrice, si.UnitPrice
      ORDER BY TotalProfit DESC
    `);

    if (profitResult.recordset.length === 0) {
      console.log('⚠️  NO PRODUCTS FOUND WITH DIFFERENT PRICES!');
      console.log('This means ALL OrderLines.UnitPrice = StockItems.UnitPrice');
    } else {
      console.table(profitResult.recordset);
    }

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
