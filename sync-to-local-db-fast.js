const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'hackathon_ro_05',
  password: process.env.DB_PASSWORD || 'B8^cNp1%',
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { encrypt: true, trustServerCertificate: true }
};

const localDbPath = path.join(__dirname, 'local-map-data.db');
const csvPath = path.join(__dirname, 'map-data-export.csv');

(async () => {
  try {
    console.log('Starting sync from remote database...\n');
    const pool = await sql.connect(sqlConfig);

    // Fetch all map data from remote
    console.log('Fetching all map data from remote database...');
    const result = await pool.request().query(`
      SELECT
        c.CityID,
        c.CityName,
        sp.StateProvinceCode,
        sp.StateProvinceName,
        co.CountryName,
        c.Location.Lat as Latitude,
        c.Location.Long as Longitude,
        c.LatestRecordedPopulation as Population,
        COALESCE(SUM(il.ExtendedPrice), 0) as Revenue,
        COALESCE(SUM(il.LineProfit), 0) as Profit,
        COUNT(DISTINCT cust.CustomerID) as CustomerCount
      FROM Application.Cities c
      LEFT JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      LEFT JOIN Application.Countries co ON sp.CountryID = co.CountryID
      LEFT JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID OR c.CityID = cust.PostalCityID
      LEFT JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      GROUP BY c.CityID, c.CityName, sp.StateProvinceCode, sp.StateProvinceName, co.CountryName, c.Location.Lat, c.Location.Long, c.LatestRecordedPopulation
    `);

    console.log(`Fetched ${result.recordset.length} cities\n`);

    // Export to CSV
    console.log('Exporting to CSV...');
    const csvHeader = 'CityID,CityName,StateProvinceCode,StateProvinceName,CountryName,Latitude,Longitude,Population,Revenue,Profit,CustomerCount\n';
    const csvRows = result.recordset.map(row => {
      const revenue = (row.Revenue || 0).toFixed(2);
      const profit = (row.Profit || 0).toFixed(2);
      return `${row.CityID},"${row.CityName}",${row.StateProvinceCode},"${row.StateProvinceName}","${row.CountryName}",${row.Latitude},${row.Longitude},${row.Population || 0},${revenue},${profit},${row.CustomerCount || 0}`;
    }).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`✓ CSV exported to: ${csvPath}\n`);

    // Create SQLite database with bulk insert
    console.log('Creating SQLite database...');
    const db = new sqlite3.Database(localDbPath);

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Drop existing table
        db.run('DROP TABLE IF EXISTS map_data');

        // Create table
        db.run(`
          CREATE TABLE map_data (
            city_id INTEGER PRIMARY KEY,
            city_name TEXT NOT NULL,
            state_code TEXT,
            state_name TEXT,
            country_name TEXT,
            latitude REAL,
            longitude REAL,
            population INTEGER,
            revenue REAL,
            profit REAL,
            profit_margin REAL,
            customer_count INTEGER
          )
        `, async (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Bulk insert using transactions
          try {
            await new Promise((res, rej) => {
              db.run('BEGIN TRANSACTION', (err) => {
                if (err) rej(err);
              });

              const stmt = db.prepare(`
                INSERT INTO map_data (city_id, city_name, state_code, state_name, country_name, latitude, longitude, population, revenue, profit, profit_margin, customer_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              let count = 0;
              for (const row of result.recordset) {
                const revenue = row.Revenue || 0;
                const profit = row.Profit || 0;
                const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

                stmt.run(
                  row.CityID,
                  row.CityName,
                  row.StateProvinceCode,
                  row.StateProvinceName,
                  row.CountryName,
                  row.Latitude,
                  row.Longitude,
                  row.Population || 0,
                  revenue,
                  profit,
                  profitMargin,
                  row.CustomerCount || 0
                );

                count++;
                if (count % 5000 === 0) {
                  process.stdout.write(`  Inserted ${count}/${result.recordset.length}...\r`);
                }
              }

              stmt.finalize((err) => {
                if (err) rej(err);
                db.run('COMMIT', (err) => {
                  if (err) rej(err);
                  else {
                    console.log(`  Inserted ${result.recordset.length}/${result.recordset.length} ✓\n`);
                    res();
                  }
                });
              });
            });

            console.log('✓ SQLite database populated\n');

            // Create indexes
            console.log('Creating indexes...');
            await new Promise((res, rej) => {
              db.serialize(() => {
                db.run('CREATE INDEX IF NOT EXISTS idx_state ON map_data(state_code)');
                db.run('CREATE INDEX IF NOT EXISTS idx_country ON map_data(country_name)');
                db.run('CREATE INDEX IF NOT EXISTS idx_revenue ON map_data(revenue)');
                db.run('CREATE INDEX IF NOT EXISTS idx_profit ON map_data(profit)', (err) => {
                  if (err) rej(err);
                  else res();
                });
              });
            });

            console.log('✓ Indexes created\n');

            // Get statistics
            console.log('=== STATISTICS ===\n');
            await new Promise((res, rej) => {
              db.all(`
                SELECT
                  COUNT(*) as total_cities,
                  COUNT(CASE WHEN customer_count > 0 THEN 1 END) as cities_with_customers,
                  SUM(revenue) as total_revenue,
                  SUM(profit) as total_profit,
                  AVG(revenue) as avg_revenue,
                  MAX(revenue) as max_revenue,
                  AVG(profit_margin) as avg_profit_margin
                FROM map_data
              `, (err, rows) => {
                if (err) {
                  rej(err);
                  return;
                }

                const stats = rows[0];
                console.log(`Total cities: ${stats.total_cities}`);
                console.log(`Cities with customers: ${stats.cities_with_customers}`);
                console.log(`Total revenue: $${parseFloat(stats.total_revenue || 0).toFixed(2)}`);
                console.log(`Total profit: $${parseFloat(stats.total_profit || 0).toFixed(2)}`);
                console.log(`Average revenue per city: $${parseFloat(stats.avg_revenue || 0).toFixed(2)}`);
                console.log(`Max revenue: $${parseFloat(stats.max_revenue || 0).toFixed(2)}`);
                console.log(`Average profit margin: ${parseFloat(stats.avg_profit_margin || 0).toFixed(2)}%\n`);

                res();
              });
            });

            console.log('✓ Sync complete!\n');
            console.log('Local files created:');
            console.log(`  • CSV: map-data-export.csv`);
            console.log(`  • Database: local-map-data.db`);
            console.log('\nReady for fast local queries!');

            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    db.close();
    pool.close();

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
