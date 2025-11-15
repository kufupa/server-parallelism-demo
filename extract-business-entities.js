const sql = require('mssql');
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

function formatCurrency(value) {
  return parseFloat(value || 0).toFixed(2);
}

function getMarkerColor(profitMargin) {
  if (profitMargin < 20) return '#cc0000';    // Red
  if (profitMargin < 40) return '#ff6600';    // Orange
  if (profitMargin < 50) return '#ffcc00';    // Yellow
  return '#00aa00';                           // Green
}

function getMarkerSize(revenue) {
  if (revenue > 1000000) return 'xl';
  if (revenue > 500000) return 'large';
  if (revenue > 100000) return 'medium';
  return 'small';
}

function calculateStrength(volume, maxVolume = 10000000) {
  return Math.min(volume / maxVolume, 1.0);
}

function getLineVisualization(strength, volume) {
  const width = Math.max(2, Math.ceil(strength * 12));
  const opacity = 0.4 + (strength * 0.6);

  let color;
  if (strength < 0.3) color = '#cccccc';    // Gray
  else if (strength < 0.6) color = '#ffcc00';  // Yellow
  else color = '#ff6600';                    // Orange

  return { lineWidth: width, lineColor: color, opacity };
}

(async () => {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('Connected to database. Extracting business entities...\n');

    // ===== 1. EXTRACT SUPPLIERS =====
    console.log('1. Extracting suppliers with metrics...');
    const supplierResult = await pool.request().query(`
      SELECT
        s.SupplierID,
        s.SupplierName,
        c.CityName,
        sp.StateProvinceCode,
        sp.StateProvinceName,
        co.CountryName,
        c.Location.Lat as Latitude,
        c.Location.Long as Longitude,
        COUNT(DISTINCT cust.CustomerID) as CustomersServed,
        COUNT(DISTINCT si.StockItemID) as ProductCount,
        COUNT(DISTINCT inv.InvoiceID) as TransactionCount,
        SUM(il.ExtendedPrice) as TotalRevenue
      FROM Purchasing.Suppliers s
      INNER JOIN Application.Cities c ON s.DeliveryCityID = c.CityID
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Application.Countries co ON sp.CountryID = co.CountryID
      INNER JOIN Warehouse.StockItems si ON s.SupplierID = si.SupplierID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      GROUP BY s.SupplierID, s.SupplierName, c.CityName, sp.StateProvinceCode, sp.StateProvinceName,
               co.CountryName, c.Location.Lat, c.Location.Long
      ORDER BY TotalRevenue DESC
    `);

    const suppliers = supplierResult.recordset.map(row => ({
      id: row.SupplierID,
      name: row.SupplierName,
      location: {
        city: row.CityName,
        state: row.StateProvinceCode,
        stateName: row.StateProvinceName,
        country: row.CountryName,
        coordinates: {
          latitude: parseFloat(row.Latitude),
          longitude: parseFloat(row.Longitude)
        }
      },
      metrics: {
        revenue: parseFloat(row.TotalRevenue || 0),
        customersServed: row.CustomersServed,
        productCount: row.ProductCount,
        transactionCount: row.TransactionCount,
        marketShare: (parseFloat(row.TotalRevenue) / 198782967.68) * 100  // Total market revenue
      },
      visualization: {
        markerType: 'star',
        markerSize: 'xl',
        markerColor: '#ff0000',
        opacity: 0.9
      }
    }));

    console.log(`   Found ${suppliers.length} suppliers\n`);

    // ===== 2. EXTRACT ALL CUSTOMERS =====
    console.log('2. Extracting all customers with metrics...');
    const customerResult = await pool.request().query(`
      SELECT
        cust.CustomerID,
        cust.CustomerName,
        c.CityName as DeliveryCityName,
        sp.StateProvinceCode,
        sp.StateProvinceName,
        co.CountryName,
        c.Location.Lat as Latitude,
        c.Location.Long as Longitude,
        COUNT(DISTINCT inv.InvoiceID) as InvoiceCount,
        COUNT(DISTINCT il.StockItemID) as ProductsOrdered,
        SUM(il.ExtendedPrice) as Revenue,
        SUM(il.ExtendedPrice) - SUM(il.LineProfit) as Cost,
        SUM(il.LineProfit) as Profit,
        (SUM(il.LineProfit) / SUM(il.ExtendedPrice)) * 100 as ProfitMargin
      FROM Sales.Customers cust
      INNER JOIN Application.Cities c ON cust.DeliveryCityID = c.CityID
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Application.Countries co ON sp.CountryID = co.CountryID
      INNER JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      INNER JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      GROUP BY cust.CustomerID, cust.CustomerName, c.CityName, sp.StateProvinceCode,
               sp.StateProvinceName, co.CountryName, c.Location.Lat, c.Location.Long
      ORDER BY Revenue DESC
    `);

    const customers = customerResult.recordset.map(row => ({
      id: row.CustomerID,
      name: row.CustomerName,
      location: {
        city: row.DeliveryCityName,
        state: row.StateProvinceCode,
        stateName: row.StateProvinceName,
        country: row.CountryName,
        coordinates: {
          latitude: parseFloat(row.Latitude),
          longitude: parseFloat(row.Longitude)
        }
      },
      metrics: {
        revenue: parseFloat(row.Revenue || 0),
        profit: parseFloat(row.Profit || 0),
        cost: parseFloat(row.Cost || 0),
        profitMargin: parseFloat(row.ProfitMargin || 0),
        invoiceCount: row.InvoiceCount,
        productsOrdered: row.ProductsOrdered
      },
      visualization: {
        markerType: 'circle',
        markerSize: getMarkerSize(row.Revenue),
        markerColor: getMarkerColor(row.ProfitMargin),
        opacity: 0.8
      }
    }));

    console.log(`   Found ${customers.length} customers\n`);

    // ===== 3. EXTRACT SUPPLIER TO CUSTOMER CONNECTIONS =====
    console.log('3. Extracting supplier-to-customer connections...');
    const connectionResult = await pool.request().query(`
      SELECT TOP 30
        s.SupplierID,
        s.SupplierName,
        cs.CityName as SupplierCity,
        sps.StateProvinceCode as SupplierState,
        cs.Location.Lat as SupplierLat,
        cs.Location.Long as SupplierLon,
        cust.CustomerID,
        cust.CustomerName,
        cc.CityName as CustomerCity,
        spc.StateProvinceCode as CustomerState,
        cc.Location.Lat as CustomerLat,
        cc.Location.Long as CustomerLon,
        COUNT(DISTINCT inv.InvoiceID) as TransactionCount,
        COUNT(DISTINCT il.StockItemID) as ProductCount,
        SUM(il.ExtendedPrice) as Volume
      FROM Purchasing.Suppliers s
      INNER JOIN Application.Cities cs ON s.DeliveryCityID = cs.CityID
      INNER JOIN Application.StateProvinces sps ON cs.StateProvinceID = sps.StateProvinceID
      INNER JOIN Warehouse.StockItems si ON s.SupplierID = si.SupplierID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities cc ON cust.DeliveryCityID = cc.CityID
      INNER JOIN Application.StateProvinces spc ON cc.StateProvinceID = spc.StateProvinceID
      GROUP BY s.SupplierID, s.SupplierName, cs.CityName, sps.StateProvinceCode,
               cs.Location.Lat, cs.Location.Long, cust.CustomerID, cust.CustomerName,
               cc.CityName, spc.StateProvinceCode, cc.Location.Lat, cc.Location.Long
      ORDER BY Volume DESC
    `);

    const maxConnectionVolume = Math.max(...connectionResult.recordset.map(r => r.Volume));

    const connections = connectionResult.recordset.map((row, idx) => {
      const strength = calculateStrength(row.Volume, maxConnectionVolume);
      const viz = getLineVisualization(strength, row.Volume);

      return {
        id: `supplier-${row.SupplierID}-customer-${row.CustomerID}-${idx}`,
        type: 'supplier_to_customer',
        from: {
          type: 'supplier',
          id: row.SupplierID,
          name: row.SupplierName,
          city: row.SupplierCity,
          state: row.SupplierState,
          coordinates: {
            latitude: parseFloat(row.SupplierLat),
            longitude: parseFloat(row.SupplierLon)
          }
        },
        to: {
          type: 'customer',
          id: row.CustomerID,
          name: row.CustomerName,
          city: row.CustomerCity,
          state: row.CustomerState,
          coordinates: {
            latitude: parseFloat(row.CustomerLat),
            longitude: parseFloat(row.CustomerLon)
          }
        },
        metrics: {
          volume: parseFloat(row.Volume || 0),
          transactionCount: row.TransactionCount,
          productCount: row.ProductCount,
          strength: strength
        },
        visualization: {
          ...viz,
          dashArray: null,
          label: `${row.SupplierName} → ${row.CustomerName} | $${(row.Volume / 1000000).toFixed(1)}M`
        }
      };
    });

    console.log(`   Found ${connections.length} supplier-to-customer connections\n`);

    // ===== 4. EXTRACT STATE-TO-STATE TRADE ROUTES =====
    console.log('4. Extracting state-to-state trade routes...');
    const tradeRouteResult = await pool.request().query(`
      SELECT TOP 20
        sps.StateProvinceCode as FromState,
        sps.StateProvinceName as FromStateName,
        spc.StateProvinceCode as ToState,
        spc.StateProvinceName as ToStateName,
        COUNT(DISTINCT cust.CustomerID) as CustomerCount,
        COUNT(DISTINCT inv.InvoiceID) as TransactionCount,
        COUNT(DISTINCT il.StockItemID) as ProductCount,
        SUM(il.ExtendedPrice) as TradeVolume
      FROM Warehouse.StockItems si
      INNER JOIN Purchasing.Suppliers s ON si.SupplierID = s.SupplierID
      INNER JOIN Application.Cities cs ON s.DeliveryCityID = cs.CityID
      INNER JOIN Application.StateProvinces sps ON cs.StateProvinceID = sps.StateProvinceID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities cc ON cust.DeliveryCityID = cc.CityID
      INNER JOIN Application.StateProvinces spc ON cc.StateProvinceID = spc.StateProvinceID
      WHERE sps.StateProvinceID != spc.StateProvinceID
      GROUP BY sps.StateProvinceCode, sps.StateProvinceName, spc.StateProvinceCode, spc.StateProvinceName
      ORDER BY TradeVolume DESC
    `);

    const maxTradeVolume = Math.max(...tradeRouteResult.recordset.map(r => r.TradeVolume));

    const tradeRoutes = tradeRouteResult.recordset.map((row, idx) => {
      const strength = calculateStrength(row.TradeVolume, maxTradeVolume);
      const viz = getLineVisualization(strength, row.TradeVolume);

      return {
        id: `${row.FromState}-${row.ToState}-${idx}`,
        type: 'state_to_state',
        from: {
          type: 'state',
          code: row.FromState,
          name: row.FromStateName
        },
        to: {
          type: 'state',
          code: row.ToState,
          name: row.ToStateName
        },
        metrics: {
          volume: parseFloat(row.TradeVolume || 0),
          transactionCount: row.TransactionCount,
          customerCount: row.CustomerCount,
          productCount: row.ProductCount,
          strength: strength
        },
        visualization: {
          ...viz,
          dashArray: null,
          label: `${row.FromState} → ${row.ToState} | $${(row.TradeVolume / 1000000).toFixed(1)}M | ${row.CustomerCount} customers`
        }
      };
    });

    console.log(`   Found ${tradeRoutes.length} state-to-state trade routes\n`);

    // ===== SAVE TO JSON FILES =====
    console.log('5. Saving to JSON files...\n');

    const outputDir = __dirname;
    fs.writeFileSync(
      path.join(outputDir, 'suppliers.json'),
      JSON.stringify(suppliers, null, 2)
    );
    console.log('   ✓ suppliers.json');

    fs.writeFileSync(
      path.join(outputDir, 'customers.json'),
      JSON.stringify(customers, null, 2)
    );
    console.log('   ✓ customers.json');

    fs.writeFileSync(
      path.join(outputDir, 'connections.json'),
      JSON.stringify(connections, null, 2)
    );
    console.log('   ✓ connections.json');

    fs.writeFileSync(
      path.join(outputDir, 'trade-routes.json'),
      JSON.stringify(tradeRoutes, null, 2)
    );
    console.log('   ✓ trade-routes.json');

    // ===== SUMMARY STATISTICS =====
    console.log('\n=== BUSINESS ENTITIES SUMMARY ===\n');
    console.log(`Suppliers:     ${suppliers.length}`);
    console.log(`Customers:     ${customers.length}`);
    console.log(`Connections:   ${connections.length}`);
    console.log(`Trade Routes:  ${tradeRoutes.length}`);

    const totalSupplierRevenue = suppliers.reduce((sum, s) => sum + s.metrics.revenue, 0);
    const totalCustomerRevenue = customers.reduce((sum, c) => sum + c.metrics.revenue, 0);

    console.log(`\nTotal Supplier Revenue: $${totalSupplierRevenue.toLocaleString('en-US', {maximumFractionDigits: 2})}`);
    console.log(`Total Customer Revenue (Top 50): $${totalCustomerRevenue.toLocaleString('en-US', {maximumFractionDigits: 2})}`);
    console.log(`Total Trade Volume (All States): $${tradeRoutes.reduce((sum, t) => sum + t.metrics.volume, 0).toLocaleString('en-US', {maximumFractionDigits: 2})}`);

    pool.close();
    console.log('\n✓ Business entity extraction complete!');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
