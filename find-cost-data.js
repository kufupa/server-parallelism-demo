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

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SEARCHING FOR COST DATA IN PURCHASING TABLES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check PurchaseOrderLines structure
    console.log('STEP 1: PurchaseOrderLines Table Structure\n');
    const poLinesSchema = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'Purchasing' AND TABLE_NAME = 'PurchaseOrderLines'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(poLinesSchema.recordset);

    // Check sample purchase order data
    console.log('\n\nSTEP 2: Sample Purchase Order Line Data\n');
    const samplePO = await pool.request().query(`
      SELECT TOP 20
        pol.PurchaseOrderLineID,
        pol.StockItemID,
        si.StockItemName,
        si.UnitPrice as CurrentSalesPrice,
        pol.OrderedOuters,
        pol.ReceivedOuters,
        po.SupplierID
      FROM Purchasing.PurchaseOrderLines pol
      JOIN Warehouse.StockItems si ON pol.StockItemID = si.StockItemID
      JOIN Purchasing.PurchaseOrders po ON pol.PurchaseOrderID = po.PurchaseOrderID
      ORDER BY pol.PurchaseOrderLineID DESC
    `);

    console.table(samplePO.recordset);

    // Check if there's pricing info in PurchaseOrders
    console.log('\n\nSTEP 3: Purchasing.PurchaseOrders Structure\n');
    const poSchema = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'Purchasing' AND TABLE_NAME = 'PurchaseOrders'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(poSchema.recordset);

    // Check SupplierTransactions - might have pricing
    console.log('\n\nSTEP 4: SupplierTransactions Structure (might have cost info)\n');
    const stSchema = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'Purchasing' AND TABLE_NAME = 'SupplierTransactions'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(stSchema.recordset);

    // Check if SupplierTransactions has amount/cost info
    console.log('\n\nSTEP 5: Sample SupplierTransactions Data\n');
    const sampleST = await pool.request().query(`
      SELECT TOP 20
        st.TransactionID,
        st.SupplierID,
        st.PurchaseOrderID,
        st.TransactionTypeID,
        st.AmountExcludingTax,
        st.TaxAmount,
        st.TransactionAmount
      FROM Purchasing.SupplierTransactions st
      ORDER BY st.TransactionID DESC
    `);

    console.table(sampleST.recordset);

    // Try to calculate average cost per item from purchase transactions
    console.log('\n\nSTEP 6: Average Purchase Price Per Item (from last 100 transactions)\n');
    const costCalc = await pool.request().query(`
      SELECT TOP 30
        si.StockItemID,
        si.StockItemName,
        si.UnitPrice as CurrentListPrice,
        AVG(st.TransactionAmount / NULLIF(pol.OrderedOuters, 0)) as AvgCostPerUnit,
        COUNT(*) as NumPurchases,
        MIN(st.TransactionAmount / NULLIF(pol.OrderedOuters, 0)) as MinCostPerUnit,
        MAX(st.TransactionAmount / NULLIF(pol.OrderedOuters, 0)) as MaxCostPerUnit
      FROM Purchasing.SupplierTransactions st
      JOIN Purchasing.PurchaseOrderLines pol ON st.PurchaseOrderID = pol.PurchaseOrderID
      JOIN Warehouse.StockItems si ON pol.StockItemID = si.StockItemID
      WHERE st.TransactionTypeID = 1  -- Purchase invoice
      GROUP BY si.StockItemID, si.StockItemName, si.UnitPrice
      ORDER BY COUNT(*) DESC
    `);

    console.table(costCalc.recordset);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
