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

    console.log('=== EXPLORING GEOGRAPHIC CONNECTIONS ===\n');

    // 1. Customer delivery flows via invoices
    console.log('1. DELIVERY FLOWS (Supplier → Customer via Invoices)\n');
    const orderFlows = await pool.request().query(`
      SELECT TOP 10
        supp_city.CityName as source_city,
        supp_sp.StateProvinceCode as source_state,
        cust_city.CityName as destination_city,
        cust_sp.StateProvinceCode as destination_state,
        COUNT(DISTINCT inv.InvoiceID) as invoice_count,
        SUM(il.Quantity) as total_quantity,
        SUM(il.ExtendedPrice) as total_value
      FROM Sales.Invoices inv
      INNER JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities cust_city ON cust.DeliveryCityID = cust_city.CityID
      INNER JOIN Application.StateProvinces cust_sp ON cust_city.StateProvinceID = cust_sp.StateProvinceID
      INNER JOIN Warehouse.StockItems si ON il.StockItemID = si.StockItemID
      INNER JOIN Purchasing.Suppliers supp ON si.SupplierID = supp.SupplierID
      INNER JOIN Application.Cities supp_city ON supp.DeliveryCityID = supp_city.CityID
      INNER JOIN Application.StateProvinces supp_sp ON supp_city.StateProvinceID = supp_sp.StateProvinceID
      WHERE supp.DeliveryCityID != cust.DeliveryCityID
      GROUP BY supp_city.CityName, supp_sp.StateProvinceCode, cust_city.CityName, cust_sp.StateProvinceCode
      ORDER BY total_value DESC
    `);

    console.log('Sample delivery flows (supplier → customer):\n');
    orderFlows.recordset.forEach(row => {
      console.log(`  ${row.source_city}, ${row.source_state} → ${row.destination_city}, ${row.destination_state}`);
      console.log(`    Invoices: ${row.invoice_count}, Qty: ${row.total_quantity}, Value: $${parseFloat(row.total_value || 0).toFixed(2)}\n`);
    });

    // 2. Supplier to customer networks
    console.log('\n2. SUPPLY CHAINS (Supplier City → Customer City via Inventory)\n');
    const supplyChains = await pool.request().query(`
      SELECT TOP 10
        supp_city.CityName as supplier_city,
        supp_city_sp.StateProvinceCode as supplier_state,
        cust_city.CityName as customer_city,
        cust_city_sp.StateProvinceCode as customer_state,
        COUNT(DISTINCT cust.CustomerID) as customer_count,
        COUNT(DISTINCT si.StockItemID) as product_count,
        SUM(il.ExtendedPrice) as revenue
      FROM Purchasing.Suppliers supp
      INNER JOIN Application.Cities supp_city ON supp.DeliveryCityID = supp_city.CityID
      INNER JOIN Application.StateProvinces supp_city_sp ON supp_city.StateProvinceID = supp_city_sp.StateProvinceID
      INNER JOIN Warehouse.StockItems si ON supp.SupplierID = si.SupplierID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities cust_city ON cust.DeliveryCityID = cust_city.CityID
      INNER JOIN Application.StateProvinces cust_city_sp ON cust_city.StateProvinceID = cust_city_sp.StateProvinceID
      GROUP BY supp_city.CityName, supp_city_sp.StateProvinceCode, cust_city.CityName, cust_city_sp.StateProvinceCode
      ORDER BY revenue DESC
    `);

    console.log('Sample supply chains (supplier → customer):\n');
    supplyChains.recordset.forEach(row => {
      console.log(`  ${row.supplier_city}, ${row.supplier_state} → ${row.customer_city}, ${row.customer_state}`);
      console.log(`    Customers served: ${row.customer_count}, Products: ${row.product_count}, Revenue: $${parseFloat(row.revenue || 0).toFixed(2)}\n`);
    });

    // 3. Delivery routes - invoice delivery origins
    console.log('\n3. DELIVERY LOCATIONS (Where Invoices are Packed/Delivered From)\n');
    const deliveryLocations = await pool.request().query(`
      SELECT TOP 10
        c.CityName,
        sp.StateProvinceCode,
        co.CountryName,
        COUNT(DISTINCT inv.InvoiceID) as invoice_count,
        SUM(il.ExtendedPrice) as total_value,
        COUNT(DISTINCT inv.DeliveryRun) as delivery_runs
      FROM Sales.Invoices inv
      INNER JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities c ON cust.DeliveryCityID = c.CityID
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Application.Countries co ON sp.CountryID = co.CountryID
      WHERE inv.DeliveryRun IS NOT NULL
      GROUP BY c.CityName, sp.StateProvinceCode, co.CountryName
      ORDER BY total_value DESC
    `);

    console.log('Delivery hubs (invoice origins):\n');
    deliveryLocations.recordset.forEach(row => {
      console.log(`  ${row.CityName}, ${row.StateProvinceCode} (${row.CountryName})`);
      console.log(`    Invoices: ${row.invoice_count}, Value: $${parseFloat(row.total_value || 0).toFixed(2)}, Delivery runs: ${row.delivery_runs}\n`);
    });

    // 4. Multi-state customer networks
    console.log('\n4. GEOGRAPHIC CLUSTERING (Customers with Multiple Locations)\n');
    const multiLocation = await pool.request().query(`
      SELECT TOP 5
        cust.CustomerName,
        cust.CustomerID,
        delivery_city.CityName as delivery_city,
        delivery_city_sp.StateProvinceCode as delivery_state,
        postal_city.CityName as postal_city,
        postal_city_sp.StateProvinceCode as postal_state,
        COUNT(DISTINCT inv.InvoiceID) as invoices,
        SUM(il.ExtendedPrice) as revenue
      FROM Sales.Customers cust
      INNER JOIN Application.Cities delivery_city ON cust.DeliveryCityID = delivery_city.CityID
      INNER JOIN Application.StateProvinces delivery_city_sp ON delivery_city.StateProvinceID = delivery_city_sp.StateProvinceID
      INNER JOIN Application.Cities postal_city ON cust.PostalCityID = postal_city.CityID
      INNER JOIN Application.StateProvinces postal_city_sp ON postal_city.StateProvinceID = postal_city_sp.StateProvinceID
      LEFT JOIN Sales.Invoices inv ON cust.CustomerID = inv.CustomerID
      LEFT JOIN Sales.InvoiceLines il ON inv.InvoiceID = il.InvoiceID
      WHERE cust.DeliveryCityID != cust.PostalCityID
      GROUP BY cust.CustomerName, cust.CustomerID, delivery_city.CityName, delivery_city_sp.StateProvinceCode, postal_city.CityName, postal_city_sp.StateProvinceCode
      ORDER BY revenue DESC
    `);

    console.log('Customers with split delivery/postal locations:\n');
    multiLocation.recordset.forEach(row => {
      console.log(`  ${row.CustomerName}`);
      console.log(`    Delivery: ${row.delivery_city}, ${row.delivery_state} ↔ Postal: ${row.postal_city}, ${row.postal_state}`);
      console.log(`    Revenue: $${parseFloat(row.revenue || 0).toFixed(2)}\n`);
    });

    // 5. State-to-state trade flows
    console.log('\n5. STATE-TO-STATE TRADE FLOWS\n');
    const stateFlows = await pool.request().query(`
      SELECT TOP 15
        supp_state.StateProvinceCode as supplier_state,
        supp_state.StateProvinceName as supplier_state_name,
        cust_state.StateProvinceCode as customer_state,
        cust_state.StateProvinceName as customer_state_name,
        COUNT(DISTINCT cust.CustomerID) as unique_customers,
        COUNT(DISTINCT inv.InvoiceID) as invoice_count,
        SUM(il.ExtendedPrice) as trade_volume
      FROM Purchasing.Suppliers supp
      INNER JOIN Application.StateProvinces supp_state ON supp.DeliveryCityID IN (SELECT CityID FROM Application.Cities WHERE StateProvinceID = supp_state.StateProvinceID)
      INNER JOIN Warehouse.StockItems si ON supp.SupplierID = si.SupplierID
      INNER JOIN Sales.InvoiceLines il ON si.StockItemID = il.StockItemID
      INNER JOIN Sales.Invoices inv ON il.InvoiceID = inv.InvoiceID
      INNER JOIN Sales.Customers cust ON inv.CustomerID = cust.CustomerID
      INNER JOIN Application.Cities cust_city ON cust.DeliveryCityID = cust_city.CityID
      INNER JOIN Application.StateProvinces cust_state ON cust_city.StateProvinceID = cust_state.StateProvinceID
      GROUP BY supp_state.StateProvinceCode, supp_state.StateProvinceName, cust_state.StateProvinceCode, cust_state.StateProvinceName
      ORDER BY trade_volume DESC
    `);

    console.log('Major inter-state trade routes:\n');
    stateFlows.recordset.forEach(row => {
      console.log(`  ${row.supplier_state_name} (${row.supplier_state}) → ${row.customer_state_name} (${row.customer_state})`);
      console.log(`    Customers: ${row.unique_customers}, Invoices: ${row.invoice_count}, Volume: $${parseFloat(row.trade_volume || 0).toFixed(2)}\n`);
    });

    pool.close();

    console.log('\n=== SCHEMA FOR GEOGRAPHIC CONNECTIONS ===\n');
    console.log(`
connection_type: "supplier_to_customer" | "customer_order_flow" | "delivery_hub"
from_city: {
  city_id: number,
  city_name: string,
  state_code: string,
  state_name: string,
  country: string,
  latitude: number,
  longitude: number
}
to_city: {
  city_id: number,
  city_name: string,
  state_code: string,
  state_name: string,
  country: string,
  latitude: number,
  longitude: number
}
metrics: {
  connection_count: number,        // orders, invoices, or transactions
  total_value: number,
  product_count: number,
  customer_count: number,
  delivery_runs: number
}
    `);

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
