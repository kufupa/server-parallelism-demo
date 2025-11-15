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

    // Get top 5 customers by revenue
    console.log('════════════════════════════════════════════════════════════════');
    console.log('                   TOP 5 CUSTOMERS BY REVENUE                    ');
    console.log('════════════════════════════════════════════════════════════════\n');

    const topCustomersResult = await pool.request().query(`
      SELECT TOP 5
        c.CustomerID,
        c.CustomerName,
        c.CreditLimit,
        COUNT(DISTINCT o.OrderID) as TotalOrders,
        SUM(ol.Quantity) as TotalUnitsOrdered,
        SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue
      FROM Sales.Customers c
      JOIN Sales.Orders o ON c.CustomerID = o.CustomerID
      JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
      GROUP BY c.CustomerID, c.CustomerName, c.CreditLimit
      ORDER BY TotalRevenue DESC
    `);

    const topCustomers = topCustomersResult.recordset;
    console.log('Quick Overview:\n');
    console.table(topCustomersResult.recordset);

    // For each top customer, get detailed product breakdown
    for (let i = 0; i < topCustomers.length; i++) {
      const customer = topCustomers[i];
      console.log('\n════════════════════════════════════════════════════════════════');
      console.log(`CUSTOMER #${i + 1}: ${customer.CustomerName} (ID: ${customer.CustomerID})`);
      console.log('════════════════════════════════════════════════════════════════');
      console.log(`Total Revenue: $${customer.TotalRevenue.toFixed(2)}`);
      console.log(`Total Orders: ${customer.TotalOrders}`);
      console.log(`Total Units Ordered: ${customer.TotalUnitsOrdered}`);
      console.log(`Credit Limit: ${customer.CreditLimit ? '$' + customer.CreditLimit.toFixed(2) : 'N/A'}`);

      // Get detailed product breakdown for this customer
      const productBreakdownResult = await pool.request().query(`
        SELECT
          si.StockItemID,
          si.StockItemName,
          SUM(ol.Quantity) as TotalQuantity,
          ol.UnitPrice as SoldPrice,
          si.UnitPrice as CurrentCost,
          SUM(ol.Quantity) * ol.UnitPrice as TotalLineValue,
          SUM(ol.Quantity) * (ol.UnitPrice - si.UnitPrice) as LineProfit,
          CAST(((ol.UnitPrice - si.UnitPrice) / ol.UnitPrice * 100) AS DECIMAL(5,2)) as ProfitMarginPercent
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
        GROUP BY si.StockItemID, si.StockItemName, ol.UnitPrice, si.UnitPrice
        ORDER BY TotalLineValue DESC
      `);

      console.log('\n--- Products Purchased (sorted by revenue) ---\n');

      // Create detailed table
      const productsData = productBreakdownResult.recordset.map((product, idx) => ({
        'Rank': idx + 1,
        'Product Name': product.StockItemName.substring(0, 35),
        'Qty': product.TotalQuantity,
        'Unit Price': `$${product.SoldPrice.toFixed(2)}`,
        'Cost': `$${product.CurrentCost.toFixed(2)}`,
        'Line Revenue': `$${product.TotalLineValue.toFixed(2)}`,
        'Line Profit': `$${product.LineProfit.toFixed(2)}`,
        'Margin %': `${product.ProfitMarginPercent}%`
      }));

      console.table(productsData);

      // Summary for this customer
      const summaryResult = await pool.request().query(`
        SELECT
          COUNT(DISTINCT si.StockItemID) as UniqueProductsPurchased,
          SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
          SUM(ol.Quantity * si.UnitPrice) as TotalCost,
          SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice) as TotalProfit,
          CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice)) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as OverallProfitMargin
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
      `);

      const summary = summaryResult.recordset[0];
      console.log('\n--- Customer Summary ---');
      console.log(`Unique Products Purchased: ${summary.UniqueProductsPurchased}`);
      console.log(`Total Revenue: $${summary.TotalRevenue.toFixed(2)}`);
      console.log(`Total Cost: $${summary.TotalCost.toFixed(2)}`);
      console.log(`Total Profit: $${summary.TotalProfit.toFixed(2)}`);
      console.log(`Overall Profit Margin: ${summary.OverallProfitMargin}%`);

      // Top 3 products for this customer
      const topProductsResult = await pool.request().query(`
        SELECT TOP 3
          si.StockItemName,
          SUM(ol.Quantity) as Quantity,
          SUM(ol.Quantity * ol.UnitPrice) as Revenue
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
        GROUP BY si.StockItemName
        ORDER BY Revenue DESC
      `);

      console.log('\n--- Top 3 Products (by revenue) ---');
      topProductsResult.recordset.forEach((product, idx) => {
        console.log(`  ${idx + 1}. ${product.StockItemName}: ${product.Quantity} units = $${product.Revenue.toFixed(2)}`);
      });
    }

    // Overall market analysis
    console.log('\n\n════════════════════════════════════════════════════════════════');
    console.log('                     MARKET ANALYSIS                             ');
    console.log('════════════════════════════════════════════════════════════════\n');

    const marketResult = await pool.request().query(`
      SELECT
        COUNT(DISTINCT c.CustomerID) as TotalCustomers,
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
    console.log(`Total Customers: ${market.TotalCustomers}`);
    console.log(`Total Market Revenue: $${market.TotalMarketRevenue.toFixed(2)}`);
    console.log(`Total Market Cost: $${market.TotalMarketCost.toFixed(2)}`);
    console.log(`Total Market Profit: $${market.TotalMarketProfit.toFixed(2)}`);
    console.log(`Average Profit Margin: ${market.AvgProfitMargin}%`);

    const top5Revenue = topCustomers.reduce((sum, c) => sum + c.TotalRevenue, 0);
    const top5Percent = (top5Revenue / market.TotalMarketRevenue * 100).toFixed(2);
    console.log(`\nTop 5 Customers Revenue: $${top5Revenue.toFixed(2)}`);
    console.log(`Top 5 Share of Market: ${top5Percent}%`);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
