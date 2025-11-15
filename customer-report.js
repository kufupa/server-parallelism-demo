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

    // For each customer, get top 10 products and profit info
    for (let i = 0; i < topCustomers.length; i++) {
      const customer = topCustomers[i];

      console.log('\n');
      console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
      console.log(`║ CUSTOMER #${i + 1}: ${customer.CustomerName.padEnd(73)} ║`);
      console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
      console.log(`║ Customer ID: ${customer.CustomerID.toString().padEnd(71)} ║`);
      console.log(`║ Total Revenue: $${customer.TotalRevenue.toFixed(2).padEnd(66)} ║`);
      console.log(`║ Total Orders: ${customer.TotalOrders.toString().padEnd(70)} ║`);
      console.log(`║ Total Units: ${customer.TotalUnitsOrdered.toString().padEnd(72)} ║`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');

      // Get customer metrics
      const metricsResult = await pool.request().query(`
        SELECT
          COUNT(DISTINCT si.StockItemID) as UniqueProducts,
          SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
          SUM(ol.Quantity * si.UnitPrice) as TotalCost,
          SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice) as TotalProfit,
          CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice)) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMargin
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
      `);

      const metrics = metricsResult.recordset[0];
      console.log('\nSUMMARY METRICS:');
      console.log(`  Unique Products Purchased: ${metrics.UniqueProducts}`);
      console.log(`  Total Cost (COGS): $${metrics.TotalCost.toFixed(2)}`);
      console.log(`  Total Revenue: $${metrics.TotalRevenue.toFixed(2)}`);
      console.log(`  Total Profit: $${metrics.TotalProfit.toFixed(2)}`);
      console.log(`  Profit Margin: ${metrics.ProfitMargin}%`);

      // Get TOP 10 PRODUCTS by revenue
      const topProductsResult = await pool.request().query(`
        SELECT TOP 10
          si.StockItemID,
          si.StockItemName,
          SUM(ol.Quantity) as TotalQty,
          ol.UnitPrice as SoldPrice,
          si.UnitPrice as CostPrice,
          SUM(ol.Quantity * ol.UnitPrice) as LineRevenue,
          SUM(ol.Quantity * (ol.UnitPrice - si.UnitPrice)) as LineProfit,
          CAST((SUM(ol.Quantity * (ol.UnitPrice - si.UnitPrice)) / SUM(ol.Quantity * ol.UnitPrice) * 100) AS DECIMAL(5,2)) as ProfitMargin
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
        GROUP BY si.StockItemID, si.StockItemName, ol.UnitPrice, si.UnitPrice
        ORDER BY SUM(ol.Quantity * ol.UnitPrice) DESC
      `);

      console.log('\nTOP 10 PRODUCTS BY REVENUE:\n');
      console.log('┌────┬────────────────────────────────────┬───────┬──────────┬──────────┬──────────────┬────────────┬──────────┐');
      console.log('│ Rk │ Product Name                       │  Qty  │ Sold $   │ Cost $   │ Line Revenue │ Profit $   │ Margin % │');
      console.log('├────┼────────────────────────────────────┼───────┼──────────┼──────────┼──────────────┼────────────┼──────────┤');

      topProductsResult.recordset.forEach((product, idx) => {
        const rank = (idx + 1).toString().padEnd(2);
        const name = product.StockItemName.substring(0, 34).padEnd(34);
        const qty = product.TotalQty.toString().padEnd(5);
        const sold = product.SoldPrice.toFixed(2).padStart(8);
        const cost = product.CostPrice.toFixed(2).padStart(8);
        const revenue = product.LineRevenue.toFixed(2).padStart(12);
        const profit = product.LineProfit.toFixed(2).padStart(10);
        const margin = product.ProfitMargin.toString().padStart(8);

        console.log(`│ ${rank} │ ${name} │ ${qty} │ ${sold} │ ${cost} │ ${revenue} │ ${profit} │ ${margin} │`);
      });

      console.log('└────┴────────────────────────────────────┴───────┴──────────┴──────────┴──────────────┴────────────┴──────────┘');
    }

    // Overall market summary
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          OVERALL MARKET ANALYSIS                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');

    const marketResult = await pool.request().query(`
      SELECT
        COUNT(DISTINCT c.CustomerID) as TotalCustomers,
        COUNT(DISTINCT o.OrderID) as TotalOrders,
        SUM(ol.Quantity) as TotalUnitsSold,
        SUM(ol.Quantity * ol.UnitPrice) as TotalMarketRevenue,
        SUM(ol.Quantity * si.UnitPrice) as TotalMarketCost,
        SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice) as TotalMarketProfit,
        CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice)) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as AvgProfitMargin
      FROM Sales.Orders o
      JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
      JOIN Sales.Customers c ON o.CustomerID = c.CustomerID
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    `);

    const market = marketResult.recordset[0];
    const top5Revenue = topCustomers.reduce((sum, c) => sum + c.TotalRevenue, 0);
    const top5Percent = (top5Revenue / market.TotalMarketRevenue * 100).toFixed(2);

    console.log(`\nTotal Customers in Market: ${market.TotalCustomers}`);
    console.log(`Total Orders: ${market.TotalOrders}`);
    console.log(`Total Units Sold: ${market.TotalUnitsSold}`);
    console.log(`Total Market Revenue: $${market.TotalMarketRevenue.toFixed(2)}`);
    console.log(`Total Market Cost: $${market.TotalMarketCost.toFixed(2)}`);
    console.log(`Total Market Profit: $${market.TotalMarketProfit.toFixed(2)}`);
    console.log(`Average Profit Margin: ${market.AvgProfitMargin}%`);

    console.log(`\n--- TOP 5 CUSTOMERS MARKET SHARE ---`);
    console.log(`Top 5 Combined Revenue: $${top5Revenue.toFixed(2)}`);
    console.log(`Top 5 Share of Total Market: ${top5Percent}%`);
    console.log(`Average Revenue per Top 5 Customer: $${(top5Revenue / 5).toFixed(2)}`);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
