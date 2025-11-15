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

    // QUERY 1: TOP N PRODUCTS BY PROFIT FOR A SPECIFIC CUSTOMER
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('QUERY 1: GET TOP N MOST PROFITABLE PRODUCTS FOR A CUSTOMER');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const customerIdExample = 977; // Customer #3
    const topNExample = 15;

    console.log(`SQL Query for Top ${topNExample} Products by Profit for Customer ${customerIdExample}:\n`);

    const query1 = `
    SELECT TOP ${topNExample}
      si.StockItemID,
      si.StockItemName,
      SUM(ol.Quantity) as Quantity,
      ol.UnitPrice as UnitSalePrice,
      COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3) as UnitCostPrice,
      SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
      SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalCost,
      SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalProfit,
      CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMarginPercent
    FROM Sales.OrderLines ol
    JOIN Sales.Orders o ON ol.OrderID = o.OrderID
    JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    LEFT JOIN (
      SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
      FROM Purchasing.PurchaseOrderLines
      WHERE ExpectedUnitPricePerOuter > 0
      GROUP BY StockItemID
    ) pol ON si.StockItemID = pol.StockItemID
    WHERE o.CustomerID = ${customerIdExample}
    GROUP BY si.StockItemID, si.StockItemName, ol.UnitPrice, si.QuantityPerOuter, pol.ExpectedUnitPricePerOuter, si.UnitPrice
    ORDER BY TotalProfit DESC`;

    console.log(query1);
    console.log('\n');

    const result1 = await pool.request().query(query1);

    console.log('RESULT (JSON format for your frontend):\n');
    console.log(JSON.stringify(result1.recordset, null, 2));

    // QUERY 2: GET CUSTOMER SUMMARY WITH PROFIT
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('QUERY 2: GET CUSTOMER PROFIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const query2 = `
    SELECT
      c.CustomerID,
      c.CustomerName,
      COUNT(DISTINCT o.OrderID) as TotalOrders,
      SUM(ol.Quantity) as TotalUnitsOrdered,
      SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
      SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalCost,
      SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalProfit,
      CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMarginPercent
    FROM Sales.Customers c
    JOIN Sales.Orders o ON c.CustomerID = o.CustomerID
    JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
    JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    LEFT JOIN (
      SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
      FROM Purchasing.PurchaseOrderLines
      WHERE ExpectedUnitPricePerOuter > 0
      GROUP BY StockItemID
    ) pol ON si.StockItemID = pol.StockItemID
    WHERE c.CustomerID = ${customerIdExample}
    GROUP BY c.CustomerID, c.CustomerName`;

    console.log(query2);
    console.log('\n');

    const result2 = await pool.request().query(query2);

    console.log('RESULT (JSON format for your frontend):\n');
    console.log(JSON.stringify(result2.recordset, null, 2));

    // QUERY 3: GET TOP CUSTOMERS BY PROFIT
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('QUERY 3: GET TOP N CUSTOMERS BY PROFIT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const topCustomersCount = 5;

    const query3 = `
    SELECT TOP ${topCustomersCount}
      c.CustomerID,
      c.CustomerName,
      COUNT(DISTINCT o.OrderID) as TotalOrders,
      SUM(ol.Quantity) as TotalUnitsOrdered,
      SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
      SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalCost,
      SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalProfit,
      CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMarginPercent
    FROM Sales.Customers c
    JOIN Sales.Orders o ON c.CustomerID = o.CustomerID
    JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
    JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    LEFT JOIN (
      SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
      FROM Purchasing.PurchaseOrderLines
      WHERE ExpectedUnitPricePerOuter > 0
      GROUP BY StockItemID
    ) pol ON si.StockItemID = pol.StockItemID
    GROUP BY c.CustomerID, c.CustomerName
    ORDER BY (SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) DESC`;

    console.log(query3);
    console.log('\n');

    const result3 = await pool.request().query(query3);

    console.log('RESULT (JSON format for your frontend):\n');
    console.log(JSON.stringify(result3.recordset, null, 2));

    // QUERY 4: GET PRODUCT PERFORMANCE METRICS
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('QUERY 4: GET PRODUCT DETAILS WITH PROFIT METRICS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const query4 = `
    SELECT
      si.StockItemID,
      si.StockItemName,
      si.Brand,
      si.Size,
      COUNT(DISTINCT o.CustomerID) as NumCustomers,
      SUM(ol.Quantity) as TotalQuantitySold,
      AVG(ol.UnitPrice) as AvgSellingPrice,
      AVG(COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as AvgCostPrice,
      SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
      SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalCost,
      SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalProfit,
      CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMarginPercent
    FROM Sales.OrderLines ol
    JOIN Sales.Orders o ON ol.OrderID = o.OrderID
    JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    LEFT JOIN (
      SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
      FROM Purchasing.PurchaseOrderLines
      WHERE ExpectedUnitPricePerOuter > 0
      GROUP BY StockItemID
    ) pol ON si.StockItemID = pol.StockItemID
    GROUP BY si.StockItemID, si.StockItemName, si.Brand, si.Size
    ORDER BY TotalProfit DESC`;

    console.log(query4);
    console.log('\n');

    const result4 = await pool.request().query(query4);

    console.log('RESULT (First 10 products, JSON format for your frontend):\n');
    console.log(JSON.stringify(result4.recordset.slice(0, 10), null, 2));

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
