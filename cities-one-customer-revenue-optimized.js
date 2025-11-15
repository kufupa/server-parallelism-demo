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
    console.log('Connected to database\n');

    // Step 1: Find cities with exactly 1 customer
    console.log('Step 1: Finding cities with 1 customer...');
    const citiesResult = await pool.request().query(`
      SELECT
        c.CityID,
        c.CityName,
        sp.StateProvinceName,
        sp.StateProvinceCode,
        co.CountryName,
        cust.CustomerID,
        cust.CustomerName
      FROM Application.Cities c
      LEFT JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      LEFT JOIN Application.Countries co ON sp.CountryID = co.CountryID
      LEFT JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID OR c.CityID = cust.PostalCityID
      WHERE cust.CustomerID IS NOT NULL
      GROUP BY c.CityID, c.CityName, sp.StateProvinceName, sp.StateProvinceCode, co.CountryName, cust.CustomerID, cust.CustomerName
      HAVING COUNT(DISTINCT cust.CustomerID) = 1
    `);

    console.log(`Found ${citiesResult.recordset.length} cities with exactly 1 customer\n`);

    // Step 2: Get revenue/profit for each customer
    console.log('Step 2: Getting revenue and profit for each customer...');
    const resultsWithMetrics = [];

    for (const city of citiesResult.recordset) {
      const metricsResult = await pool.request()
        .input('customerId', sql.Int, city.CustomerID)
        .query(`
          SELECT
            COALESCE(SUM(il.ExtendedPrice), 0) as TotalRevenue,
            COALESCE(SUM(il.LineProfit), 0) as TotalProfit,
            COUNT(DISTINCT inv.InvoiceID) as InvoiceCount,
            COUNT(DISTINCT ord.OrderID) as OrderCount
          FROM Sales.Customers c
          LEFT JOIN Sales.Invoices inv ON c.CustomerID = inv.CustomerID
          LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
          LEFT JOIN Sales.Orders ord ON c.CustomerID = ord.CustomerID
          WHERE c.CustomerID = @customerId
        `);

      const metrics = metricsResult.recordset[0];
      resultsWithMetrics.push({
        ...city,
        TotalRevenue: metrics.TotalRevenue,
        TotalProfit: metrics.TotalProfit,
        InvoiceCount: metrics.InvoiceCount,
        OrderCount: metrics.OrderCount
      });
    }

    console.log('\n=== TOP 50 CITIES (1 CUSTOMER) BY REVENUE ===\n');

    // Sort by revenue
    const sortedByRevenue = [...resultsWithMetrics].sort((a, b) => b.TotalRevenue - a.TotalRevenue);

    console.log(`${'Rank'} | ${'City'.padEnd(25)} | ${'State'.padEnd(5)} | ${'Country'.padEnd(15)} | ${'Customer Name'.padEnd(25)} | ${'Revenue'.padEnd(12)} | ${'Profit'.padEnd(12)} | Orders`);
    console.log('-'.repeat(140));

    for (let i = 0; i < Math.min(50, sortedByRevenue.length); i++) {
      const row = sortedByRevenue[i];
      const revenue = row.TotalRevenue ? row.TotalRevenue.toFixed(2) : '0.00';
      const profit = row.TotalProfit ? row.TotalProfit.toFixed(2) : '0.00';

      console.log(
        `${(i + 1).toString().padEnd(4)} | ${(row.CityName).substring(0, 25).padEnd(25)} | ${(row.StateProvinceCode || 'N/A').padEnd(5)} | ${(row.CountryName || 'N/A').substring(0, 15).padEnd(15)} | ${(row.CustomerName).substring(0, 25).padEnd(25)} | $${revenue.padEnd(11)} | $${profit.padEnd(11)} | ${row.OrderCount}`
      );
    }

    // Sort by profit
    console.log('\n\n=== TOP 50 CITIES (1 CUSTOMER) BY PROFIT ===\n');
    const sortedByProfit = [...resultsWithMetrics].sort((a, b) => b.TotalProfit - a.TotalProfit);

    console.log(`${'Rank'} | ${'City'.padEnd(25)} | ${'State'.padEnd(5)} | ${'Country'.padEnd(15)} | ${'Customer Name'.padEnd(25)} | ${'Revenue'.padEnd(12)} | ${'Profit'.padEnd(12)} | Orders`);
    console.log('-'.repeat(140));

    for (let i = 0; i < Math.min(50, sortedByProfit.length); i++) {
      const row = sortedByProfit[i];
      const revenue = row.TotalRevenue ? row.TotalRevenue.toFixed(2) : '0.00';
      const profit = row.TotalProfit ? row.TotalProfit.toFixed(2) : '0.00';

      console.log(
        `${(i + 1).toString().padEnd(4)} | ${(row.CityName).substring(0, 25).padEnd(25)} | ${(row.StateProvinceCode || 'N/A').padEnd(5)} | ${(row.CountryName || 'N/A').substring(0, 15).padEnd(15)} | ${(row.CustomerName).substring(0, 25).padEnd(25)} | $${revenue.padEnd(11)} | $${profit.padEnd(11)} | ${row.OrderCount}`
      );
    }

    // Statistics
    console.log('\n\n=== STATISTICS ===\n');
    const revenues = resultsWithMetrics.map(r => r.TotalRevenue || 0);
    const profits = resultsWithMetrics.map(r => r.TotalProfit || 0);

    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalProfit = profits.reduce((a, b) => a + b, 0);
    const avgRevenue = (totalRevenue / resultsWithMetrics.length).toFixed(2);
    const avgProfit = (totalProfit / resultsWithMetrics.length).toFixed(2);
    const maxRevenue = Math.max(...revenues);
    const maxProfit = Math.max(...profits);

    console.log(`Total cities with 1 customer: ${resultsWithMetrics.length}`);
    console.log(`Total combined revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total combined profit: $${totalProfit.toFixed(2)}`);
    console.log(`Average revenue per city: $${avgRevenue}`);
    console.log(`Average profit per city: $${avgProfit}`);
    console.log(`Highest revenue: $${maxRevenue.toFixed(2)}`);
    console.log(`Highest profit: $${maxProfit.toFixed(2)}`);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
