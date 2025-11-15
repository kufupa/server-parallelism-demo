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

    console.log('=== GEOGRAPHIC CONNECTIONS IN DATABASE ===\n');

    // 1. Customer networks - multi-city customers
    console.log('1. MULTI-LOCATION CUSTOMERS (Billing ↔ Shipping Locations)\n');
    const multiCityCustomers = await pool.request().query(`
      SELECT TOP 15
        cust.CustomerName,
        c1.CityName as billing_city,
        sp1.StateProvinceCode as billing_state,
        c2.CityName as shipping_city,
        sp2.StateProvinceCode as shipping_state,
        COUNT(DISTINCT inv.InvoiceID) as invoice_count,
        SUM(il.ExtendedPrice) as revenue
      FROM Sales.Customers cust
      INNER JOIN Application.Cities c1 ON cust.PostalCityID = c1.CityID
      INNER JOIN Application.StateProvinces sp1 ON c1.StateProvinceID = sp1.StateProvinceID
      INNER JOIN Application.Cities c2 ON cust.DeliveryCityID = c2.CityID
      INNER JOIN Application.StateProvinces sp2 ON c2.StateProvinceID = sp2.StateProvinceID
      LEFT JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      WHERE cust.PostalCityID != cust.DeliveryCityID
      GROUP BY cust.CustomerName, c1.CityName, sp1.StateProvinceCode, c2.CityName, sp2.StateProvinceCode
      ORDER BY revenue DESC
    `);

    console.log('Customers with split billing/shipping locations:\n');
    multiCityCustomers.recordset.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.CustomerName}`);
      console.log(`     Bill: ${row.billing_city}, ${row.billing_state} ↔ Ship: ${row.shipping_city}, ${row.shipping_state}`);
      console.log(`     Revenue: $${parseFloat(row.revenue || 0).toFixed(2)}\n`);
    });

    // 2. Supplier locations and reach
    console.log('2. SUPPLIER HUB ANALYSIS\n');
    const supplierReach = await pool.request().query(`
      SELECT TOP 10
        s.SupplierName,
        c.CityName as supplier_city,
        sp.StateProvinceCode as supplier_state,
        COUNT(DISTINCT cust.CustomerID) as customers_served,
        COUNT(DISTINCT si.StockItemID) as products,
        SUM(il.ExtendedPrice) as total_sales
      FROM Purchasing.Suppliers s
      INNER JOIN Application.Cities c ON s.DeliveryCityID = c.CityID
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Warehouse.StockItems si ON s.SupplierID = si.SupplierID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      GROUP BY s.SupplierName, c.CityName, sp.StateProvinceCode
      ORDER BY total_sales DESC
    `);

    console.log('Top suppliers by geographic reach:\n');
    supplierReach.recordset.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.SupplierName} (${row.supplier_city}, ${row.supplier_state})`);
      console.log(`     Serves: ${row.customers_served} customers | Products: ${row.products} | Sales: $${parseFloat(row.total_sales || 0).toFixed(2)}\n`);
    });

    // 3. State-to-state flows
    console.log('3. STATE-TO-STATE TRADE FLOWS\n');
    const stateFlows = await pool.request().query(`
      SELECT TOP 15
        sp1.StateProvinceCode as from_state,
        sp1.StateProvinceName as from_state_name,
        sp2.StateProvinceCode as to_state,
        sp2.StateProvinceName as to_state_name,
        COUNT(DISTINCT cust.CustomerID) as customer_count,
        COUNT(DISTINCT inv.InvoiceID) as transaction_count,
        SUM(il.ExtendedPrice) as trade_volume
      FROM Warehouse.StockItems si
      INNER JOIN Purchasing.Suppliers s ON si.SupplierID = s.SupplierID
      INNER JOIN Application.Cities c1 ON s.DeliveryCityID = c1.CityID
      INNER JOIN Application.StateProvinces sp1 ON c1.StateProvinceID = sp1.StateProvinceID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities c2 ON cust.DeliveryCityID = c2.CityID
      INNER JOIN Application.StateProvinces sp2 ON c2.StateProvinceID = sp2.StateProvinceID
      WHERE sp1.StateProvinceID != sp2.StateProvinceID
      GROUP BY sp1.StateProvinceCode, sp1.StateProvinceName, sp2.StateProvinceCode, sp2.StateProvinceName
      ORDER BY trade_volume DESC
    `);

    console.log('Inter-state supply routes:\n');
    stateFlows.recordset.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.from_state_name} (${row.from_state}) → ${row.to_state_name} (${row.to_state})`);
      console.log(`     Customers: ${row.customer_count} | Transactions: ${row.transaction_count} | Volume: $${parseFloat(row.trade_volume || 0).toFixed(2)}\n`);
    });

    // 4. City clustering - where do goods flow to?
    console.log('4. CUSTOMER CONCENTRATION HUBS\n');
    const hubs = await pool.request().query(`
      SELECT TOP 10
        c.CityName,
        sp.StateProvinceCode,
        COUNT(DISTINCT cust.CustomerID) as customers_in_city,
        COUNT(DISTINCT inv.InvoiceID) as invoices,
        SUM(il.ExtendedPrice) as total_revenue
      FROM Application.Cities c
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID
      INNER JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      INNER JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      GROUP BY c.CityName, sp.StateProvinceCode
      ORDER BY total_revenue DESC
    `);

    console.log('Top customer concentration hubs:\n');
    hubs.recordset.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.CityName}, ${row.StateProvinceCode}`);
      console.log(`     Customers: ${row.customers_in_city} | Invoices: ${row.invoices} | Revenue: $${parseFloat(row.total_revenue || 0).toFixed(2)}\n`);
    });

    pool.close();

    console.log('\n=== SCHEMA FOR MAP CONNECTIONS ===\n');
    console.log(`
For visualizing connections on a map, use this data structure:

{
  "connections": [
    {
      "type": "supplier_to_customer" | "state_to_state" | "customer_hub",
      "from": {
        "city": string,
        "state": string,
        "latitude": number,
        "longitude": number,
        "entity_type": "supplier" | "state" | "city"
      },
      "to": {
        "city": string,
        "state": string,
        "latitude": number,
        "longitude": number,
        "entity_type": "customer" | "state" | "city"
      },
      "metrics": {
        "volume": number,           // Revenue or transaction count
        "customer_count": number,   // How many customers
        "product_count": number,    // Unique products
        "strength": "weak" | "medium" | "strong"  // Based on volume
      }
    }
  ]
}

Available Connections:
✓ Supplier city → Customer cities (supply chains)
✓ Supplier state → Customer state (inter-state flows)
✓ Billing city ↔ Shipping city (same customer)
✓ Customer concentration hubs (multiple customers in one city)
✗ Delivery routes (no detailed routing data)
✗ Warehouse locations (not in current schema)
✗ Real-time tracking (no temporal movement data)
    `);

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
