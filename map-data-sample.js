const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'hackathon_ro_05',
  password: process.env.DB_PASSWORD || 'B8^cNp1%',
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { encrypt: true, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = await sql.connect(sqlConfig);

    // Get sample data with all map-related fields
    const result = await pool.request().query(`
      SELECT TOP 50
        c.CityID,
        c.CityName,
        sp.StateProvinceCode,
        sp.StateProvinceName,
        co.CountryName,
        c.Location.Lat as Latitude,
        c.Location.Long as Longitude,
        c.LatestRecordedPopulation,
        COALESCE(SUM(il.ExtendedPrice), 0) as Revenue,
        COALESCE(SUM(il.LineProfit), 0) as Profit,
        COUNT(DISTINCT cust.CustomerID) as CustomerCount
      FROM Application.Cities c
      LEFT JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      LEFT JOIN Application.Countries co ON sp.CountryID = co.CountryID
      LEFT JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID OR c.CityID = cust.PostalCityID
      LEFT JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      WHERE cust.CustomerID IS NOT NULL
      GROUP BY c.CityID, c.CityName, sp.StateProvinceCode, sp.StateProvinceName, co.CountryName, c.Location.Lat, c.Location.Long, c.LatestRecordedPopulation
      ORDER BY Revenue DESC
    `);

    console.log('=== MAP DATA INTERFACE (JSON) ===\n');

    // Convert to GeoJSON-like format
    const mapData = result.recordset.map(row => ({
      id: row.CityID,
      name: row.CityName,
      state: row.StateProvinceCode,
      stateName: row.StateProvinceName,
      country: row.CountryName,
      coordinates: {
        latitude: row.Latitude,
        longitude: row.Longitude
      },
      population: row.LatestRecordedPopulation || 0,
      metrics: {
        revenue: parseFloat((row.Revenue || 0).toFixed(2)),
        profit: parseFloat((row.Profit || 0).toFixed(2)),
        profitMargin: row.Revenue > 0 ? parseFloat(((row.Profit / row.Revenue) * 100).toFixed(2)) : 0,
        customerCount: row.CustomerCount
      }
    }));

    console.log(JSON.stringify(mapData, null, 2));

    console.log('\n\n=== QUERY TO GET ALL MAP DATA ===\n');
    console.log(`
    SELECT
      c.CityID as id,
      c.CityName as name,
      sp.StateProvinceCode as state,
      sp.StateProvinceName as stateName,
      co.CountryName as country,
      c.Location.Lat as latitude,
      c.Location.Long as longitude,
      c.LatestRecordedPopulation as population,
      COALESCE(SUM(il.ExtendedPrice), 0) as revenue,
      COALESCE(SUM(il.LineProfit), 0) as profit,
      COUNT(DISTINCT cust.CustomerID) as customerCount
    FROM Application.Cities c
    LEFT JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
    LEFT JOIN Application.Countries co ON sp.CountryID = co.CountryID
    LEFT JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID OR c.CityID = cust.PostalCityID
    LEFT JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
    LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
    WHERE cust.CustomerID IS NOT NULL
    GROUP BY c.CityID, c.CityName, sp.StateProvinceCode, sp.StateProvinceName, co.CountryName, c.Location, c.LatestRecordedPopulation
    `);

    console.log('\n=== DATA FIELD DESCRIPTIONS ===\n');
    console.log('coordinates.latitude    → Y-axis for map positioning (float, range: -90 to 90)');
    console.log('coordinates.longitude   → X-axis for map positioning (float, range: -180 to 180)');
    console.log('population              → Integer for marker size scaling');
    console.log('revenue                 → USD currency (decimal) for color intensity');
    console.log('profit                  → USD currency (decimal) for performance indicator');
    console.log('profitMargin            → Percentage (0-100) for efficiency metric');
    console.log('state                   → 2-letter code for grouping/filtering');
    console.log('customerCount           → Integer for clustering analysis');

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
