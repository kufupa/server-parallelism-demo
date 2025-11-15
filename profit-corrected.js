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

    console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║          REAL PROFIT ANALYSIS - TOP 5 CUSTOMERS BY REVENUE (CORRECTED)            ║');
    console.log('║              (Cost per unit = OuterPrice / QuantityPerOuter)                      ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

    // First, let's verify the cost calculation
    console.log('VERIFICATION: Sample cost calculation\n');
    const verifyResult = await pool.request().query(`
      SELECT TOP 10
        si.StockItemName,
        si.QuantityPerOuter,
        pol.ExpectedUnitPricePerOuter,
        (pol.ExpectedUnitPricePerOuter / CAST(si.QuantityPerOuter AS DECIMAL(10,2))) as CostPerUnit,
        si.UnitPrice as SalesPrice
      FROM Warehouse.StockItems si
      JOIN Purchasing.PurchaseOrderLines pol ON si.StockItemID = pol.StockItemID
      WHERE pol.ExpectedUnitPricePerOuter > 0
      ORDER BY NEWID()
    `);
    console.table(verifyResult.recordset);
    console.log('\n');

    // Get top 5 customers by revenue
    const topCustomersResult = await pool.request().query(`
      SELECT TOP 5
        c.CustomerID,
        c.CustomerName,
        COUNT(DISTINCT o.OrderID) as TotalOrders,
        SUM(ol.Quantity) as TotalUnitsOrdered,
        SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue
      FROM Sales.Customers c
      JOIN Sales.Orders o ON c.CustomerID = o.CustomerID
      JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
      GROUP BY c.CustomerID, c.CustomerName
      ORDER BY TotalRevenue DESC
    `);

    const topCustomers = topCustomersResult.recordset;

    // For each top customer
    for (let i = 0; i < topCustomers.length; i++) {
      const customer = topCustomers[i];

      console.log(`\n${'═'.repeat(88)}`);
      console.log(`CUSTOMER #${i + 1}: ${customer.CustomerName} (ID: ${customer.CustomerID})`);
      console.log(`${'═'.repeat(88)}`);
      console.log(`Revenue: $${customer.TotalRevenue.toFixed(2)} | Orders: ${customer.TotalOrders} | Units: ${customer.TotalUnitsOrdered}\n`);

      // Calculate profit with corrected cost
      const profitSummaryResult = await pool.request().query(`
        SELECT
          SUM(ol.Quantity) as TotalQty,
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
        WHERE o.CustomerID = ${customer.CustomerID}
      `);

      const summary = profitSummaryResult.recordset[0];

      console.log('PROFIT SUMMARY:');
      console.log(`  Total Revenue: $${summary.TotalRevenue.toFixed(2)}`);
      console.log(`  Total Cost: $${summary.TotalCost.toFixed(2)}`);
      console.log(`  ✅ TOTAL PROFIT: $${summary.TotalProfit.toFixed(2)}`);
      console.log(`  ✅ PROFIT MARGIN: ${summary.ProfitMarginPercent}%\n`);

      // Top 15 products by revenue WITH corrected profit
      const topProductsResult = await pool.request().query(`
        SELECT TOP 15
          si.StockItemName,
          SUM(ol.Quantity) as TotalQty,
          ol.UnitPrice as SalePrice,
          CAST(COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3) AS DECIMAL(10,2)) as CostPrice,
          SUM(ol.Quantity * ol.UnitPrice) as Revenue,
          SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as Cost,
          SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as Profit,
          CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMargin
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        LEFT JOIN (
          SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
          FROM Purchasing.PurchaseOrderLines
          WHERE ExpectedUnitPricePerOuter > 0
          GROUP BY StockItemID
        ) pol ON si.StockItemID = pol.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
        GROUP BY si.StockItemName, ol.UnitPrice, si.QuantityPerOuter, pol.ExpectedUnitPricePerOuter, si.UnitPrice
        ORDER BY SUM(ol.Quantity * ol.UnitPrice) DESC
      `);

      console.log('TOP 15 PRODUCTS (by revenue):');
      console.log('');
      console.log('┌────┬──────────────────────────────────┬───────┬──────┬────────┬─────────────┬──────────┬──────────┬──────┐');
      console.log('│ Rk │ Product Name                     │  Qty  │ Sell │ Cost   │ Revenue     │ Cost $   │ Profit $ │ M %  │');
      console.log('├────┼──────────────────────────────────┼───────┼──────┼────────┼─────────────┼──────────┼──────────┼──────┤');

      topProductsResult.recordset.forEach((product, idx) => {
        const rank = (idx + 1).toString().padEnd(2);
        const name = product.StockItemName.substring(0, 32).padEnd(32);
        const qty = product.TotalQty.toString().padEnd(5);
        const sell = product.SalePrice.toFixed(2).padStart(4);
        const cost = product.CostPrice.toFixed(2).padStart(6);
        const revenue = product.Revenue.toFixed(2).padStart(11);
        const costTotal = product.Cost.toFixed(2).padStart(8);
        const profit = product.Profit.toFixed(2).padStart(8);
        const margin = product.ProfitMargin.toString().padStart(4);

        console.log(`│ ${rank} │ ${name} │ ${qty} │ ${sell} │ ${cost} │ ${revenue} │ ${costTotal} │ ${profit} │ ${margin} │`);
      });

      console.log('└────┴──────────────────────────────────┴───────┴──────┴────────┴─────────────┴──────────┴──────────┴──────┘');
    }

    // Overall market analysis
    console.log(`\n\n${'═'.repeat(88)}`);
    console.log('MARKET-WIDE PROFIT ANALYSIS');
    console.log(`${'═'.repeat(88)}\n`);

    const marketResult = await pool.request().query(`
      SELECT
        COUNT(DISTINCT c.CustomerID) as TotalCustomers,
        COUNT(DISTINCT o.OrderID) as TotalOrders,
        SUM(ol.Quantity) as TotalUnitsSold,
        SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
        SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalCost,
        SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalProfit,
        CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMargin
      FROM Sales.Orders o
      JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
      JOIN Sales.Customers c ON o.CustomerID = c.CustomerID
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
      LEFT JOIN (
        SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
        FROM Purchasing.PurchaseOrderLines
        WHERE ExpectedUnitPricePerOuter > 0
        GROUP BY StockItemID
      ) pol ON si.StockItemID = pol.StockItemID
    `);

    const market = marketResult.recordset[0];

    console.log(`Total Customers: ${market.TotalCustomers}`);
    console.log(`Total Orders: ${market.TotalOrders}`);
    console.log(`Total Units Sold: ${market.TotalUnitsSold}`);
    console.log(`\nTotal Revenue: $${market.TotalRevenue.toFixed(2)}`);
    console.log(`Total Cost: $${market.TotalCost.toFixed(2)}`);
    console.log(`✅ TOTAL PROFIT: $${market.TotalProfit.toFixed(2)}`);
    console.log(`✅ PROFIT MARGIN: ${market.ProfitMargin}%`);

    // Top 5 share
    const top5Revenue = topCustomers.reduce((sum, c) => sum + c.TotalRevenue, 0);
    console.log(`\n--- TOP 5 CUSTOMERS CONTRIBUTION ---`);
    console.log(`Revenue: $${top5Revenue.toFixed(2)} (${(top5Revenue / market.TotalRevenue * 100).toFixed(2)}% of total)`);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
