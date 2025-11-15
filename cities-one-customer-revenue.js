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

    // Get cities with exactly 1 customer and their revenue/profit
    const result = await pool.request().query(`
      SELECT
        c.CityID,
        c.CityName,
        sp.StateProvinceName,
        sp.StateProvinceCode,
        co.CountryName,
        cust.CustomerID,
        cust.CustomerName,
        COUNT(DISTINCT cust.CustomerID) as CustomerCount,
        COALESCE(SUM(il.ExtendedPrice), 0) as TotalRevenue,
        COALESCE(SUM(il.LineProfit), 0) as TotalProfit,
        COUNT(DISTINCT inv.InvoiceID) as InvoiceCount,
        COUNT(DISTINCT ol.OrderID) as OrderCount
      FROM Application.Cities c
      LEFT JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      LEFT JOIN Application.Countries co ON sp.CountryID = co.CountryID
      LEFT JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID OR c.CityID = cust.PostalCityID
      LEFT JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      LEFT JOIN Sales.Orders ord ON cust.CustomerID = ord.CustomerID
      LEFT JOIN Sales.OrderLines ol ON ord.OrderID = ol.OrderID
      WHERE cust.CustomerID IS NOT NULL
      GROUP BY c.CityID, c.CityName, sp.StateProvinceName, sp.StateProvinceCode, co.CountryName, cust.CustomerID, cust.CustomerName
      HAVING COUNT(DISTINCT cust.CustomerID) = 1
      ORDER BY TotalRevenue DESC
    `);

    console.log(`=== CITIES WITH EXACTLY 1 CUSTOMER - RANKED BY REVENUE ===\n`);
    console.log(`Total cities with 1 customer: ${result.recordset.length}\n`);

    console.log(`${'#'.padEnd(4)} | ${'City'.padEnd(25)} | ${'Customer Name'.padEnd(25)} | ${'Revenue'.padEnd(15)} | ${'Profit'.padEnd(15)} | ${'Orders'} | ${'Invoices'}`);
    console.log('-'.repeat(130));

    for (let i = 0; i < result.recordset.length; i++) {
      const row = result.recordset[i];
      const revenue = row.TotalRevenue ? row.TotalRevenue.toFixed(2) : '0.00';
      const profit = row.TotalProfit ? row.TotalProfit.toFixed(2) : '0.00';

      console.log(
        `${(i + 1).toString().padEnd(4)} | ${(row.CityName + ' (' + row.StateProvinceCode + ')').padEnd(25)} | ${(row.CustomerName).substring(0, 25).padEnd(25)} | $${revenue.padEnd(14)} | $${profit.padEnd(14)} | ${row.OrderCount.toString().padEnd(7)} | ${row.InvoiceCount}`
      );
    }

    // Top 20 by revenue
    console.log('\n\n=== TOP 20 CITIES (1 CUSTOMER) BY REVENUE ===\n');
    console.log(`${'Rank'} | ${'City'.padEnd(25)} | ${'State'.padEnd(6)} | ${'Country'.padEnd(20)} | ${'Customer'.padEnd(25)} | ${'Revenue'.padEnd(15)} | ${'Profit'.padEnd(15)}`);
    console.log('-'.repeat(150));

    for (let i = 0; i < Math.min(20, result.recordset.length); i++) {
      const row = result.recordset[i];
      const revenue = row.TotalRevenue ? row.TotalRevenue.toFixed(2) : '0.00';
      const profit = row.TotalProfit ? row.TotalProfit.toFixed(2) : '0.00';

      console.log(
        `${(i + 1).toString().padEnd(4)} | ${row.CityName.substring(0, 25).padEnd(25)} | ${(row.StateProvinceCode || 'N/A').padEnd(6)} | ${(row.CountryName || 'N/A').substring(0, 20).padEnd(20)} | ${row.CustomerName.substring(0, 25).padEnd(25)} | $${revenue.padEnd(14)} | $${profit.padEnd(14)}`
      );
    }

    // Top 20 by profit
    console.log('\n\n=== TOP 20 CITIES (1 CUSTOMER) BY PROFIT ===\n');
    const sortedByProfit = [...result.recordset].sort((a, b) => (b.TotalProfit || 0) - (a.TotalProfit || 0));

    console.log(`${'Rank'} | ${'City'.padEnd(25)} | ${'State'.padEnd(6)} | ${'Country'.padEnd(20)} | ${'Customer'.padEnd(25)} | ${'Revenue'.padEnd(15)} | ${'Profit'.padEnd(15)}`);
    console.log('-'.repeat(150));

    for (let i = 0; i < Math.min(20, sortedByProfit.length); i++) {
      const row = sortedByProfit[i];
      const revenue = row.TotalRevenue ? row.TotalRevenue.toFixed(2) : '0.00';
      const profit = row.TotalProfit ? row.TotalProfit.toFixed(2) : '0.00';

      console.log(
        `${(i + 1).toString().padEnd(4)} | ${row.CityName.substring(0, 25).padEnd(25)} | ${(row.StateProvinceCode || 'N/A').padEnd(6)} | ${(row.CountryName || 'N/A').substring(0, 20).padEnd(20)} | ${row.CustomerName.substring(0, 25).padEnd(25)} | $${revenue.padEnd(14)} | $${profit.padEnd(14)}`
      );
    }

    // Statistics
    console.log('\n\n=== STATISTICS ===\n');
    const revenues = result.recordset.map(r => r.TotalRevenue || 0);
    const profits = result.recordset.map(r => r.TotalProfit || 0);

    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalProfit = profits.reduce((a, b) => a + b, 0);
    const avgRevenue = (totalRevenue / result.recordset.length).toFixed(2);
    const avgProfit = (totalProfit / result.recordset.length).toFixed(2);
    const maxRevenue = Math.max(...revenues);
    const maxProfit = Math.max(...profits);
    const minRevenue = Math.min(...revenues);
    const minProfit = Math.min(...profits);

    console.log(`Total cities with 1 customer: ${result.recordset.length}`);
    console.log(`Total combined revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total combined profit: $${totalProfit.toFixed(2)}`);
    console.log(`Average revenue per city: $${avgRevenue}`);
    console.log(`Average profit per city: $${avgProfit}`);
    console.log(`Highest revenue: $${maxRevenue.toFixed(2)}`);
    console.log(`Highest profit: $${maxProfit.toFixed(2)}`);
    console.log(`Lowest revenue: $${minRevenue.toFixed(2)}`);
    console.log(`Lowest profit: $${minProfit.toFixed(2)}`);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
