const sql = require('mssql');

// Configuration from environment variables
const sqlConfig = {
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'hackathon_ro_05',
      password: process.env.DB_PASSWORD || 'B8^cNp1%'
    }
  },
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  }
};

// Connection pool
let pool;

/**
 * Initialize SQL Server connection pool
 * @returns {Promise<void>}
 */
async function initializePool() {
  try {
    pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log('✓ SQL Server connection pool initialized');

    // Set up event handlers
    pool.on('error', (err) => {
      console.error('SQL Server pool error:', err);
    });
  } catch (err) {
    console.error('Failed to initialize SQL Server pool:', err);
    throw err;
  }
}

/**
 * Execute query with retry logic
 * @param {string} queryString - SQL query
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retries (default 2)
 * @returns {Promise<Object>}
 */
async function executeQuery(queryString, params = [], retries = 2) {
  if (!pool) {
    throw new Error('Connection pool not initialized. Call initializePool() first.');
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const request = pool.request();

      // Bind parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace ? with @paramX
      let query = queryString;
      for (let i = 0; i < params.length; i++) {
        query = query.replace('?', `@param${i}`);
      }

      const result = await request.query(query);
      return result.recordset;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(`Query attempt ${attempt + 1} failed, retrying... (${err.message})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Get order history for a customer
 * @param {number} customerId - Customer ID
 * @returns {Promise<Array>}
 */
async function getCustomerOrders(customerId) {
  const query = `
    SELECT TOP 50
      o.OrderID,
      o.OrderDate,
      COUNT(DISTINCT ol.StockItemID) AS ProductCount,
      SUM(ol.Quantity * ol.UnitPrice) AS OrderTotal,
      SUM(ol.Quantity * (ol.UnitPrice - ol.UnitCost)) AS OrderProfit
    FROM Sales.Orders o
    JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
    WHERE o.CustomerID = ?
    GROUP BY o.OrderID, o.OrderDate
    ORDER BY o.OrderDate DESC
  `;

  return executeQuery(query, [customerId]);
}

/**
 * Get product breakdown for a customer
 * @param {number} customerId - Customer ID
 * @returns {Promise<Array>}
 */
async function getCustomerProducts(customerId) {
  const query = `
    SELECT TOP 20
      si.StockItemName,
      COUNT(DISTINCT ol.OrderID) AS OrderCount,
      SUM(ol.Quantity) AS TotalQuantity,
      SUM(ol.Quantity * ol.UnitPrice) AS TotalRevenue,
      SUM(ol.Quantity * (ol.UnitPrice - ol.UnitCost)) AS TotalProfit,
      CASE
        WHEN SUM(ol.Quantity * (ol.UnitPrice - ol.UnitCost)) > 0 THEN 'profitable'
        ELSE 'loss'
      END AS Profitability
    FROM Sales.OrderLines ol
    JOIN Sales.Orders o ON ol.OrderID = o.OrderID
    JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    WHERE o.CustomerID = ?
    GROUP BY si.StockItemName
    ORDER BY TotalProfit DESC
  `;

  return executeQuery(query, [customerId]);
}

/**
 * Get customer invoices
 * @param {number} customerId - Customer ID
 * @returns {Promise<Array>}
 */
async function getCustomerInvoices(customerId) {
  const query = `
    SELECT TOP 30
      i.InvoiceID,
      i.InvoiceDate,
      COUNT(DISTINCT il.StockItemID) AS ProductCount,
      SUM(il.Quantity * il.UnitPrice) AS InvoiceTotal,
      SUM(il.Quantity * (il.UnitPrice - il.UnitCost)) AS InvoiceProfit
    FROM Sales.Invoices i
    JOIN Sales.InvoiceLines il ON i.InvoiceID = il.InvoiceID
    WHERE i.CustomerID = ?
    GROUP BY i.InvoiceID, i.InvoiceDate
    ORDER BY i.InvoiceDate DESC
  `;

  return executeQuery(query, [customerId]);
}

/**
 * Get customer details with aggregates
 * @param {number} customerId - Customer ID
 * @returns {Promise<Object>}
 */
async function getCustomerDetails(customerId) {
  const query = `
    SELECT TOP 1
      c.CustomerID,
      c.CustomerName,
      c.CityID,
      ct.CityName,
      ct.StateProvinceID,
      sp.StateProvinceName,
      SUM(ol.Quantity * ol.UnitPrice) AS TotalRevenue,
      SUM(ol.Quantity * (ol.UnitPrice - ol.UnitCost)) AS TotalProfit,
      COUNT(DISTINCT o.OrderID) AS TotalOrders,
      COUNT(DISTINCT o.OrderDate) AS DaysActive
    FROM Sales.Customers c
    LEFT JOIN Application.Cities ct ON c.DeliveryCityID = ct.CityID
    LEFT JOIN Application.StateProvinces sp ON ct.StateProvinceID = sp.StateProvinceID
    LEFT JOIN Sales.Orders o ON c.CustomerID = o.CustomerID
    LEFT JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
    WHERE c.CustomerID = ?
    GROUP BY c.CustomerID, c.CustomerName, c.CityID, ct.CityName, ct.StateProvinceID, sp.StateProvinceName
  `;

  const results = await executeQuery(query, [customerId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.close();
    console.log('✓ SQL Server connection pool closed');
  }
}

module.exports = {
  initializePool,
  executeQuery,
  getCustomerOrders,
  getCustomerProducts,
  getCustomerInvoices,
  getCustomerDetails,
  closePool
};
